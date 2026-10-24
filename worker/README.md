# Peedya API on Cloudflare Workers

Handles online payment (Razorpay) and card login. It replaces the old Supabase Edge Functions.

## Deploy (one time)
1. Install Node.js, then in this folder: `npm install`
2. `npx wrangler login`
3. Add the secrets (each command asks you to paste the value; they are stored safely at Cloudflare, never in your files):
   ``npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_ANON_KEY
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put RAZORPAY_KEY_ID
   npx wrangler secret put RAZORPAY_KEY_SECRET
   npx wrangler secret put ALLOWED_ORIGIN        # optional, e.g. https://peedya.in
   ```
   `SUPABASE_SERVICE_ROLE_KEY` is in Supabase *Project Settings > API*. It is very powerful: it must only ever be stored here.
4. `npx wrangler deploy`. It prints an address like `https://peedya-api.YOUR-NAME.workers.dev`.
5. Put that address in `API_BASE` in `assets/js/config.js` and upload the website again.

If you use your own domain for the Worker (not `*.workers.dev`), add it to `connect-src` in the `Content-Security-Policy` tag of `index.html`.

## Test on your computer
Copy `.dev.vars.example` to `.dev.vars`, fill it in, run `npx wrangler dev`.
`.dev.vars` is ignored by git. **Never upload it to your website host.**

## Routes
- `POST /create-order` `{ items: [{ id, q }] }` (needs the customer's login token)
- `POST /verify-payment` `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` (needs the login token)
- `POST /card-login` `{ card, code }`
