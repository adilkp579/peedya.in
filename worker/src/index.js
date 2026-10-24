// Peedya API on Cloudflare Workers (replaces the Supabase Edge Functions).
//   POST /create-order     { items: [{ id, q }] }                      -> { order_id, amount, currency, key_id }
//   POST /verify-payment   { razorpay_order_id, razorpay_payment_id, razorpay_signature } -> { success: true }
//   POST /card-login       { card, code }                              -> { token_hash }
// Secrets (never in the website files): see worker/README.md. Set them with `wrangler secret put NAME`.

const json = (env, body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    },
  })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const basic = (id, secret) => 'Basic ' + btoa(id + ':' + secret)

const rzpKeys = (env) => (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET ? { id: env.RAZORPAY_KEY_ID, secret: env.RAZORPAY_KEY_SECRET } : null)

// the signed-in customer (guest or password account) from the Authorization header
async function currentUser(request, env) {
  const auth = request.headers.get('Authorization') || ''
  if (!/^Bearer\s+\S+/.test(auth)) return null
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: auth } })
  if (!r.ok) return null
  const u = await r.json()
  return u && u.id ? { user: u, auth } : null
}

async function hmacHex(message, secret) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

const svc = (env, extra = {}) => ({ apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, ...extra })

// ---------- POST /create-order ----------
async function createOrder(request, env) {
  const keys = rzpKeys(env)
  if (!keys) return json(env, { error: 'Online payment is not configured' }, 500)
  const me = await currentUser(request, env)
  if (!me) return json(env, { error: 'Please start again (your session has ended)' }, 401)

  let body
  try { body = await request.json() } catch { return json(env, { error: 'Invalid request' }, 400) }
  const items = Array.isArray(body.items) ? body.items : []
  if (!items.length || items.length > 50) return json(env, { error: 'Your cart is empty' }, 400)
  const lines = items.map((i) => ({ id: Number(i.id), q: Number(i.q) }))
  if (lines.some((l) => !Number.isInteger(l.id) || !Number.isInteger(l.q) || l.q < 1 || l.q > 20)) return json(env, { error: 'Invalid item' }, 400)

  const ids = [...new Set(lines.map((l) => l.id))]
  const pr = await fetch(
    `${env.SUPABASE_URL}/rest/v1/products?select=id,name,price,delivery_fee,visible,in_stock,pay_online&id=in.(${ids.join(',')})`,
    { headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: me.auth } },
  )
  if (!pr.ok) return json(env, { error: 'Could not read the products' }, 500)
  const prods = await pr.json()

  let sub = 0
  let ship = 0
  const seen = new Set()
  for (const l of lines) {
    const p = prods.find((x) => x.id === l.id)
    if (!p || !p.visible || !p.in_stock) return json(env, { error: 'Some items are unavailable' }, 400)
    if (!p.pay_online) return json(env, { error: `Online payment is not available for ${p.name}` }, 400)
    sub += Number(p.price) * l.q
    if (!seen.has(p.id)) { seen.add(p.id); ship += Number(p.delivery_fee || 0) } // delivery charge once per product
  }
  const amount = Math.round((sub + ship) * 100) // paise (online payment has no COD charge)
  if (amount < 100) return json(env, { error: 'Minimum payment is ₹1' }, 400)

  const rz = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: basic(keys.id, keys.secret), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: ('wk_' + me.user.id.slice(0, 8) + '_' + Date.now().toString(36)).slice(0, 40),
      notes: { user_id: me.user.id },
    }),
  })
  if (rz.status === 401) return json(env, { error: 'Razorpay authentication failed. Check the API keys.' }, 401)
  if (!rz.ok) return json(env, { error: 'Razorpay could not create the order' }, 500)
  const order = await rz.json()
  return json(env, { order_id: order.id, amount: order.amount, currency: order.currency, key_id: keys.id })
}

// ---------- POST /verify-payment ----------
async function verifyPayment(request, env) {
  const keys = rzpKeys(env)
  if (!keys) return json(env, { error: 'Online payment is not configured' }, 500)
  const me = await currentUser(request, env)
  if (!me) return json(env, { error: 'Please start again (your session has ended)' }, 401)

  let b
  try { b = await request.json() } catch { return json(env, { error: 'Invalid request' }, 400) }
  const orderId = String(b.razorpay_order_id || '')
  const paymentId = String(b.razorpay_payment_id || '')
  const signature = String(b.razorpay_signature || '')
  if (!orderId || !paymentId || !signature) return json(env, { error: 'Missing payment details' }, 400)

  const expected = await hmacHex(orderId + '|' + paymentId, keys.secret)
  if (!safeEqual(expected, signature.toLowerCase())) return json(env, { success: false, error: 'Payment signature does not match' }, 400)

  const rz = await fetch('https://api.razorpay.com/v1/orders/' + encodeURIComponent(orderId), { headers: { Authorization: basic(keys.id, keys.secret) } })
  if (rz.status === 401) return json(env, { error: 'Razorpay authentication failed. Check the API keys.' }, 401)
  if (!rz.ok) return json(env, { error: 'Could not confirm the payment with Razorpay' }, 500)
  const order = await rz.json()
  if (!order.notes || order.notes.user_id !== me.user.id) return json(env, { success: false, error: 'This payment belongs to another account' }, 400)

  const ins = await fetch(`${env.SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: svc(env, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
    body: JSON.stringify({ razorpay_payment_id: paymentId, razorpay_order_id: orderId, user_id: me.user.id, amount_paise: order.amount }),
  })
  if (!ins.ok && ins.status !== 409) return json(env, { error: 'Could not save the payment' }, 500) // 409 = already saved
  return json(env, { success: true, payment_id: paymentId })
}

// ---------- POST /card-login ----------
async function cardLogin(request, env) {
  let b
  try { b = await request.json() } catch { return json(env, { error: 'Invalid request' }, 400) }
  const card = String(b.card || '').replace(/\s+/g, '')
  const code = String(b.code || '').trim()
  if (!/^[0-9]{16}$/.test(card) || !/^[0-9]{3}$/.test(code)) return json(env, { error: 'Enter the 16-digit card number and the 3-digit security code.' }, 400)

  // one atomic check per attempt in the database: it counts wrong codes and locks the card (1 h after 5 wrong codes, doubling up to 24 h)
  const t = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/card_try`, {
    method: 'POST', headers: svc(env, { 'Content-Type': 'application/json' }), body: JSON.stringify({ p_card: card, p_code: code }),
  })
  if (!t.ok) return json(env, { error: 'Could not check the card. Please try again.' }, 500)
  const rows = await t.json()
  const r = Array.isArray(rows) ? rows[0] : rows
  if (!r) return json(env, { error: 'Could not check the card. Please try again.' }, 500)

  if (!r.ok) {
    await sleep(500) // slows down guessing
    if (r.lock_until && new Date(r.lock_until) > new Date()) {
      const mins = Math.max(1, Math.ceil((new Date(r.lock_until).getTime() - Date.now()) / 60000))
      return json(env, { error: `Too many wrong attempts. This card is locked for ${mins} minute${mins > 1 ? 's' : ''}. You can still log in with your mobile number and password.` }, 429)
    }
    return json(env, { error: 'The card number or security code is not correct.' }, 400)
  }

  // correct card + code: give the browser a one-time sign-in token for that customer
  const ur = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${r.uid}`, { headers: svc(env) })
  if (!ur.ok) return json(env, { error: 'Could not log in. Please try again.' }, 500)
  const user = await ur.json()
  let email = user.email
  if (!email) {
    email = 'c' + String(r.uid).replace(/-/g, '') + '@cards.peedya.invalid'
    const up = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${r.uid}`, {
      method: 'PUT', headers: svc(env, { 'Content-Type': 'application/json' }), body: JSON.stringify({ email, email_confirm: true }),
    })
    if (!up.ok) return json(env, { error: 'Could not log in. Please try again.' }, 500)
  }
  const gl = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST', headers: svc(env, { 'Content-Type': 'application/json' }), body: JSON.stringify({ type: 'magiclink', email }),
  })
  const link = gl.ok ? await gl.json() : null
  const token = link && (link.hashed_token || (link.properties && link.properties.hashed_token))
  if (!token) return json(env, { error: 'Could not log in. Please try again.' }, 500)
  return json(env, { token_hash: token })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
          'Access-Control-Allow-Headers': 'authorization, content-type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Max-Age': '86400',
          Vary: 'Origin',
        },
      })
    }
    const { pathname } = new URL(request.url)
    if (request.method === 'GET' && pathname === '/') return json(env, { ok: true, service: 'peedya-api' })
    if (request.method !== 'POST') return json(env, { error: 'Method not allowed' }, 405)
    try {
      if (pathname === '/create-order') return await createOrder(request, env)
      if (pathname === '/verify-payment') return await verifyPayment(request, env)
      if (pathname === '/card-login') return await cardLogin(request, env)
    } catch (e) {
      return json(env, { error: 'Something went wrong. Please try again.' }, 500)
    }
    return json(env, { error: 'Not found' }, 404)
  },
}
