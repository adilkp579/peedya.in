/*! Peedya seller panel (seller/seller.js) - seller sign-up, add products (admin approves them), orders, payments, settings. */
document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG')t.style.visibility='hidden'},true);document.addEventListener('load',function(e){var t=e.target;if(t&&t.tagName==='IMG'&&t.style.visibility==='hidden')t.style.visibility=''},true);
'use strict';
const CFG=window.WK_CONFIG||{};
window.addEventListener('unhandledrejection',ev=>{const m=(ev.reason&&ev.reason.message)||String(ev.reason||'');const x=document.getElementById('ts');if(x){x.textContent='Error: '+m;x.className='toast show bad'}});
window.addEventListener('error',ev=>{const x=document.getElementById('ts');if(x){x.textContent='Error: '+ev.message;x.className='toast show bad'}});
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>'₹'+Number(n||0).toLocaleString('en-IN');
const img=(i,w)=>/^(https?:|data:|\/|\.)/.test(i||'')?i:'https://images.unsplash.com/photo-'+i+'?auto=format&fit=crop&w='+(w||300)+'&q=80';
const toast=(t,bad)=>{const x=$('#ts');x.textContent=t;x.className='toast show'+(bad?' bad':'');clearTimeout(toast.t);toast.t=setTimeout(()=>x.classList.remove('show'),3200)};
const dt=t=>new Date(t).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
let sb=null;try{if(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY)sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY,{auth:{storageKey:'peedya-seller-auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})}catch(_){}

const MOB=/^[6-9]\d{9}$/;
const STATES=['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal','Other state / UT'];
const SL=['Order Placed','Packed','Shipped','Out for Delivery','Delivered'],TH=[0,2,24,72,96];
const PRE={letters:['XS','S','M','L','XL','XXL','3XL'],numbers:['4','5','6','7','8','9','10','11','12']};
const T={dash:'Dashboard',prod:'My Products',ord:'Orders',pay:'Payments',set:'Settings'};
let U=null,S=null,CATS=[],MP=[],OR=[],PY=[],COST={},V='dash',AUTH={sent:false,m:''},FM=null,booting=false;

/* ---------- sign in / create account (email + password) ---------- */
let MODE='login',RECOVERY=false,PT=null;
function gate(h){$('#app').hidden=true;$('#gate').hidden=false;$('#gate').innerHTML=h}
const brand='<div class="lg" style="padding:0 0 14px;color:#111">Peedya <small>Seller</small></div>';
const enterKey=(ids,btn)=>ids.forEach(i=>$(i).addEventListener('keydown',ev=>{if(ev.key==='Enter')$(btn).click()}));
function authUI(){
if(!sb)return gate('<div class="card"><h1>Seller</h1><p class="mut">The store is not connected yet. Fill in assets/js/config.js first.</p></div>');
if(MODE==='signup')return regUI(false);
gate(`<div class="card">${brand}<h1>Seller login</h1><p class="mut">Log in to manage your products and orders.</p><div style="margin-top:16px"><label>Email<input id="le" type="email" autocomplete="email" autocapitalize="none" placeholder="you@example.com"></label><label>Password<input id="lp" type="password" autocomplete="current-password"></label></div><button class="btn" id="lb" style="width:100%">Log in</button><div class="err" id="lr"></div><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px"><button class="lnk" id="lf">Forgot password?</button><button class="lnk" id="lc">Create a seller account</button></div><p class="mut" style="margin-top:10px"><a href="../">← Back to store</a></p></div>`);
enterKey(['#le','#lp'],'#lb');
$('#lc').onclick=()=>{MODE='signup';authUI()};
$('#lf').onclick=async()=>{const er=$('#lr'),em=$('#le').value.trim();er.style.color='';if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))return er.textContent='Enter your email above first, then tap “Forgot password?”.';const r=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});if(r.error)return er.textContent=r.error.message;er.style.color='#1e7a43';er.textContent='If this email has an account, a password reset link is on its way.'};
$('#lb').onclick=async ev=>{const er=$('#lr'),b=ev.currentTarget,em=$('#le').value.trim(),pw=$('#lp').value;er.style.color='';er.textContent='';
if(!em||!pw)return er.textContent='Enter your email and password.';
b.disabled=true;const r=await sb.auth.signInWithPassword({email:em,password:pw});b.disabled=false;
if(r.error)return er.textContent=/confirm/i.test(r.error.message)?'Please confirm your email first: open the link we sent you, then log in.':/invalid/i.test(r.error.message)?'Incorrect email or password.':r.error.message;
boot()}}
function recoverUI(){gate(`<div class="card">${brand}<h1>Set a new password</h1><p class="mut">Choose a new password for your seller account.</p><div style="margin-top:16px"><label>New password<input id="np" type="password" autocomplete="new-password" placeholder="At least 8 characters"></label><label>Confirm password<input id="np2" type="password" autocomplete="new-password"></label></div><button class="btn" id="nb2" style="width:100%">Save password</button><div class="err" id="nr"></div></div>`);
$('#nb2').onclick=async ev=>{const er=$('#nr'),p=$('#np').value;if(p.length<8)return er.textContent='Password must be at least 8 characters.';if(p!==$('#np2').value)return er.textContent='The two passwords do not match.';ev.currentTarget.disabled=true;const r=await sb.auth.updateUser({password:p});if(r.error){ev.currentTarget.disabled=false;return er.textContent=r.error.message}RECOVERY=false;toast('Password updated');boot()}}

/* ---------- seller account form (shared by sign-up and Settings) ---------- */
function sellerFields(p,s,pay){s=s||{};const a=s.address||{},b=s.bank||{};
return `<h3 class="sec">Business details</h3>
<div class="row"><label>Store / business name <span class="req">*</span><input id="${p}bn" maxlength="60" value="${e(s.business_name||'')}" placeholder="e.g. Aisha Fashions"></label><label>Owner full name <span class="req">*</span><input id="${p}on" maxlength="60" value="${e(s.owner_name||'')}"></label></div>
<div class="row"><label>Business type<select id="${p}bt">${['Individual','Proprietorship','Partnership','Private Limited','Other'].map(x=>`<option${x===(s.business_type||'Individual')?' selected':''}>${x}</option>`).join('')}</select></label><label>Mobile number <span class="req">*</span><div class="fld"><span>+91</span><input id="${p}mb" type="tel" inputmode="numeric" maxlength="10" value="${e(s.mobile||'')}" placeholder="10-digit number"></div></label></div>
<label>Contact email <span class="req">*</span><input id="${p}em" type="email" maxlength="80" autocapitalize="none" value="${e(s.email||'')}" placeholder="you@example.com"></label>
<h3 class="sec">Business address</h3>
<label>Address line 1 <span class="req">*</span><input id="${p}a1" maxlength="80" value="${e(a.a1||'')}" placeholder="Building, street"></label>
<label>Address line 2<input id="${p}a2" maxlength="80" value="${e(a.a2||'')}" placeholder="Area, landmark (optional)"></label>
<div class="row row3"><label>City <span class="req">*</span><input id="${p}c" maxlength="40" value="${e(a.c||'')}"></label><label>State <span class="req">*</span><select id="${p}s"><option value="">Select</option>${STATES.map(x=>`<option${x===a.s?' selected':''}>${e(x)}</option>`).join('')}</select></label><label>PIN code <span class="req">*</span><input id="${p}p" inputmode="numeric" maxlength="6" value="${e(a.p||'')}"></label></div>
<h3 class="sec">Tax details <span class="mut" style="font-weight:400">(optional)</span></h3>
<label>GSTIN<input id="${p}gs" maxlength="15" value="${e(s.gstin||'')}" placeholder="15-character GST number, if you have one"></label>
${pay?`<h3 class="sec">Payout details</h3><p class="hint" style="margin:-4px 0 12px">Add a UPI ID, bank details, or both. Your earnings are paid here.</p>
<label>UPI ID<input id="${p}up" maxlength="60" autocapitalize="none" value="${e(s.upi||'')}" placeholder="name@bank"></label>
<div class="row row3"><label>Account holder name<input id="${p}bh" maxlength="60" value="${e(b.h||'')}"></label><label>Account number<input id="${p}ba" inputmode="numeric" maxlength="18" value="${e(b.a||'')}"></label><label>IFSC code<input id="${p}bi" maxlength="11" value="${e(b.i||'')}" placeholder="e.g. SBIN0001234"></label></div>`:''}`}
function readSeller(p,pay){const g=id=>$('#'+p+id).value.trim().replace(/[<>"]/g,'');
const o={business_name:g('bn'),owner_name:g('on'),business_type:$('#'+p+'bt').value,mobile:g('mb'),email:g('em'),address:{a1:g('a1'),a2:g('a2'),c:g('c'),s:$('#'+p+'s').value,p:g('p')},gstin:g('gs').toUpperCase()};
if(o.business_name.length<2)return{err:'Enter your store / business name.'};
if(o.owner_name.length<2)return{err:'Enter the owner’s full name.'};
if(!MOB.test(o.mobile))return{err:'Enter a valid 10-digit mobile number.'};
if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(o.email))return{err:'Enter a valid email address.'};
if(o.address.a1.length<3)return{err:'Enter your business address.'};
if(o.address.c.length<2)return{err:'Enter your city.'};
if(!o.address.s)return{err:'Select your state.'};
if(!/^\d{6}$/.test(o.address.p))return{err:'Enter a valid 6-digit PIN code.'};
if(o.gstin&&!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(o.gstin))return{err:'That GSTIN does not look right. Leave it empty if you do not have one.'};
const row={business_name:o.business_name,owner_name:o.owner_name,business_type:o.business_type,mobile:o.mobile,email:o.email,address:o.address,gstin:o.gstin||null};
if(pay){const b={h:g('bh'),a:g('ba'),i:g('bi').toUpperCase()},up=g('up'),anyB=b.h||b.a||b.i;
if(up&&!/^[\w.\-]{2,}@[A-Za-z]{2,}$/.test(up))return{err:'Enter a valid UPI ID, like name@bank.'};
if(anyB){if(!b.h||!b.a||!b.i)return{err:'Fill in all three bank fields (holder, account number, IFSC) or leave them all empty.'};
if(!/^\d{9,18}$/.test(b.a))return{err:'Account number should be 9 to 18 digits.'};
if(!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(b.i))return{err:'IFSC code should look like SBIN0001234.'}}
row.upi=up||null;row.bank=anyB?b:{}}
return{row}}
const digits=ids=>ids.forEach(i=>{const el=$('#'+i);if(el)el.oninput=()=>{el.value=el.value.replace(/\D/g,'')}});
function applied(){gate(`<div class="card">${brand}<h1>Check your email</h1><p class="mut" style="margin:8px 0 16px">We sent a confirmation link to your email. Open it to confirm your address, then come back here and log in. Your seller application is saved and will go to the Peedya admin as soon as you log in.</p><button class="btn" id="bk" style="width:100%">Go to login</button></div>`);$('#bk').onclick=()=>{MODE='login';authUI()}}
function regUI(loggedIn){
const pre=loggedIn?{email:U.email}:{};
gate(`<div class="card wide">${brand}<h1>Create your seller account</h1><p class="mut">Fill in your details and choose a password. The Peedya admin reviews every application. Once it is accepted you can log in and add products.</p>${sellerFields('r',pre)}
${loggedIn?'':`<h3 class="sec">Login password</h3><p class="hint" style="margin:-4px 0 12px">You will log in with the contact email above and this password.</p><div class="row"><label>Password <span class="req">*</span><input id="rpw" type="password" autocomplete="new-password" placeholder="At least 8 characters"></label><label>Confirm password <span class="req">*</span><input id="rpw2" type="password" autocomplete="new-password"></label></div>`}
<label style="display:flex;align-items:flex-start;gap:8px;font-weight:500;margin-top:6px"><input type="checkbox" id="rag" style="margin-top:3px"><span>I confirm the details are correct and I agree to the <a href="../terms.html" target="_blank" rel="noopener">Terms &amp; Conditions</a> and <a href="../privacy.html" target="_blank" rel="noopener">Privacy Policy</a>.</span></label>
<div class="err" id="re"></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="rsub">Submit application</button><button class="btn l" id="rx">${loggedIn?'Log out':'I already have an account'}</button></div></div>`);
digits(['rmb','rp']);
$('#rx').onclick=()=>{if(loggedIn)sb.auth.signOut();else{MODE='login';authUI()}};
$('#rsub').onclick=async ev=>{const er=$('#re'),fail=t=>{er.textContent=t;er.scrollIntoView({block:'center',behavior:'smooth'});toast(t,1)};er.textContent='';const v=readSeller('r');if(v.err)return fail(v.err);
let pw='';if(!loggedIn){pw=$('#rpw').value;if(pw.length<8)return fail('Password must be at least 8 characters.');if(pw!==$('#rpw2').value)return fail('The two passwords do not match.')}
if(!$('#rag').checked)return fail('Please tick the box to agree to the terms.');
const b=ev.currentTarget;b.disabled=true;
if(loggedIn){const r=await sb.from('sellers').insert({user_id:U.id,...v.row});b.disabled=false;if(r.error)return fail(setupMsg(r.error.message));toast('Application submitted');return boot()}
const r=await sb.auth.signUp({email:v.row.email,password:pw,options:{data:{seller_app:v.row},emailRedirectTo:location.origin+location.pathname}});b.disabled=false;
if(r.error)return fail(/registered|exists/i.test(r.error.message)?'This email already has an account. Please log in instead.':r.error.message);
if(r.data.user&&r.data.user.identities&&!r.data.user.identities.length)return fail('This email already has an account. Please log in instead.');
if(r.data.session){U=r.data.session.user;const ex=await sb.from('sellers').select('user_id').eq('user_id',U.id).maybeSingle();if(!ex.data){const i=await sb.from('sellers').insert({user_id:U.id,...v.row});if(i.error)return fail(setupMsg(i.error.message))}sb.auth.updateUser({data:{seller_app:null}})}
thanks(!!r.data.session)}}
function thanks(sess){gate(`<div class="card" style="text-align:center">${brand}<div style="font-size:46px;margin-bottom:6px">✅</div><h1>Thank you for creating your seller account!</h1><p class="mut" style="margin:10px 0 18px;text-align:left">Your application has been sent to the Peedya team. We will check your details and accept your account soon.<br><br>${sess?'Once it is accepted, your <b style="color:#111">seller dashboard opens automatically</b> and you can start adding products.':'<b style="color:#111">Please also confirm your email</b> using the link we just sent you. After the admin accepts your account, log in here to open your seller dashboard and start adding products.'}</p><button class="btn" id="th1" style="width:100%">${sess?'Continue':'Go to login'}</button></div>`);
$('#th1').onclick=()=>{MODE='login';sess?boot():authUI()}}
const setupMsg=m=>/sellers|schema cache|relation/.test(m)?'Seller feature is not set up yet: run the updated supabase/schema.sql in Supabase.':m;
function statusUI(kind){const rej=kind==='rejected',sus=kind==='suspended';clearTimeout(PT);
gate(`<div class="card">${brand}<h1>${rej?'Application not approved':sus?'Account paused':'Application under review'}</h1><p class="mut" style="margin:8px 0 16px">${rej?'Sorry, the Peedya admin did not approve this seller application.'+(S.review_note?'<br><br><b style="color:#111">Reason:</b> '+e(S.review_note):'')+'<br><br>For help, contact '+'peedya.in@gmail.com.':sus?'Your seller account is currently paused. Please contact peedya.in@gmail.com.':'Thanks, '+e(S.owner_name)+'! Your seller account for <b style="color:#111">'+e(S.business_name)+'</b> is with the Peedya admin. This page checks automatically, and your seller dashboard opens as soon as it is accepted.'}</p><div style="display:flex;gap:10px;flex-wrap:wrap">${rej||sus?'':'<button class="btn" id="st1">Check status</button>'}<button class="btn l" id="st2">Log out</button></div></div>`);
if($('#st1'))$('#st1').onclick=()=>boot();$('#st2').onclick=()=>sb.auth.signOut();
if(!rej&&!sus)PT=setTimeout(boot,10000)}

/* ---------- data ---------- */
async function loadAll(){
const R=await Promise.all([sb.from('categories').select('name').order('sort').order('id'),sb.from('products').select('*').eq('seller_id',U.id).order('id',{ascending:false}),sb.rpc('seller_orders'),sb.from('seller_payouts').select('*').order('paid_at',{ascending:false}),sb.from('product_costs').select('product_id,cost')]);
PY=R[3]&&!R[3].error?R[3].data:[];COST={};(R[4]&&!R[4].error?R[4].data:[]).forEach(c=>{COST[c.product_id]=+c.cost});CATS=R[0].error?[]:R[0].data.map(c=>c.name);MP=R[1].error?[]:R[1].data;OR=R[2].error?[]:R[2].data;
if(R[1].error)toast(R[1].error.message,1)}
let PCH=null;
async function enter(){await loadAll();$('#gate').hidden=true;$('#app').hidden=false;go(V);
if(!PCH&&sb.channel)PCH=sb.channel('wk-seller-pay').on('postgres_changes',{event:'INSERT',schema:'public',table:'seller_payouts',filter:'seller_id=eq.'+U.id},async p=>{toast('New payment received: '+fmt(p.new&&p.new.amount));await loadAll();go(V,true)}).subscribe()}
async function boot(){if(booting||RECOVERY)return;booting=true;clearTimeout(PT);try{
if(!sb){authUI();return}
const g=await sb.auth.getSession();U=g.data.session?g.data.session.user:null;
if(!U){S=null;authUI();return}
let r=await sb.from('sellers').select('*').eq('user_id',U.id).maybeSingle();
if(r.error&&!/relation|does not exist|schema cache/.test(r.error.message))toast(r.error.message,1);
S=r.data;
if(!S){const app=U.user_metadata&&U.user_metadata.seller_app;
 if(app){const i=await sb.from('sellers').insert({user_id:U.id,...app}).select('*').single();if(!i.error){S=i.data;await sb.auth.updateUser({data:{seller_app:null}})}else toast(setupMsg(i.error.message),1)}
 if(!S){regUI(true);return}}
if(S.status!=='active')return statusUI(S.status);
await enter()}finally{booting=false}}

/* ---------- views ---------- */
const stat=o=>{if(o.stage!=null)return+o.stage;let ix=0;const h=(Date.now()-Date.parse(o.created_at))/36e5;TH.forEach((x,i)=>{if(h>=x)ix=i});return ix};
const oState=o=>o.status==='pending'?'Awaiting confirmation':o.status==='rejected'?'Cancelled':SL[stat(o)];
const pchip=p=>`<span class="stt ${p.status}">${p.status==='approved'?'Live':p.status==='pending'?'Waiting for approval':'Rejected'}</span>`;
const varTxt=l=>[l.s?'Size '+e(l.s):'',l.c?e(l.c):''].filter(Boolean).join(' · ');
function go(v,keep){V=v;$('#ttl').textContent=T[v];$$('.sb [data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v));$('#sb').classList.remove('open');
$('#act').innerHTML=v==='prod'?'<button class="btn" data-a="padd">+ Add product</button>':'';
$('#vw').innerHTML=({dash,prod,ord,pay,set})[v]();if(v==='set')bindSet();if(!keep)window.scrollTo(0,0)}
const lineProfit=l=>COST[l.id]==null?0:(+l.p-COST[l.id])*+l.q,orderProfit=o=>(o.lines||[]).reduce((a,l)=>a+lineProfit(l),0),costMissing=o=>(o.lines||[]).some(l=>COST[l.id]==null);
const profitDone=()=>OR.filter(o=>o.status==='accepted'&&stat(o)===4).reduce((a,o)=>a+orderProfit(o),0),profitWay=()=>OR.filter(o=>o.status==='accepted'&&stat(o)<4).reduce((a,o)=>a+orderProfit(o),0);
function popup(msg,focusId){const d=document.createElement('div');d.className='popup';d.innerHTML='<div class="pbox" role="alertdialog" aria-modal="true"><div class="pic">!</div><p></p><button class="btn" type="button">OK</button></div>';d.querySelector('p').textContent=msg;const close=()=>{d.remove();const el=focusId&&$('#'+focusId);if(el){el.focus();el.scrollIntoView({block:'center'})}};d.querySelector('button').onclick=close;d.addEventListener('click',ev=>{if(ev.target===d)close()});document.body.appendChild(d);d.querySelector('button').focus()}
const earned=()=>OR.filter(o=>o.status==='accepted'&&stat(o)===4).reduce((a,o)=>a+ +o.amount,0),gotCash=()=>PY.reduce((a,x)=>a+ +x.amount,0),pendCash=()=>Math.max(0,earned()-gotCash());
const newPay=()=>PY.filter(x=>!x.seen_at);
const payRows=l=>l.map(x=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #eee"><span>${dt(x.paid_at)}<br><small class="mut">${e(x.note||'Payment from Peedya')}</small></span><b style="color:#1d7a46">${fmt(x.amount)}</b></div>`).join('');
function dash(){const live=MP.filter(p=>p.status==='approved'),pd=MP.filter(p=>p.status==='pending'),rj=MP.filter(p=>p.status==='rejected'),ok=OR.filter(o=>o.status==='accepted'),sales=ok.reduce((a,o)=>a+ +o.amount,0),low=live.filter(p=>p.stock!=null&&p.stock<=5);
return `<p class="mut" style="margin:-8px 0 18px">Welcome, <b style="color:#111">${e(S.business_name)}</b></p>
${rj.length?`<div class="note" style="background:#fde8eb;border-color:#f5c2c9;color:#8f1f31"><b>${rj.length} product${rj.length>1?'s were':' was'} rejected.</b> Open My Products to see the reason, fix it and submit again.</div>`:''}
${!S.upi&&!(S.bank&&S.bank.a)?'<div class="note">Add your UPI ID or bank details in <b>Settings</b> so you can be paid.</div>':''}
${!MP.length?'<div class="note">You have no products yet. Open <b>My Products</b> and tap <b>+ Add product</b> to add your first one.</div>':''}
${pd.length?`<div class="note">${pd.length} product${pd.length>1?'s are':' is'} waiting for admin approval. They go live in the store once approved.</div>`:''}
<div class="g4"><div class="card st"><b>${MP.length}</b><span>Total products</span></div><div class="card st"><b>${live.length}</b><span>Live in store</span></div><div class="card st"><b>${pd.length}</b><span>Waiting for approval</span></div><div class="card st"><b>${OR.filter(o=>o.status==='pending').length}</b><span>New orders</span></div><div class="card st"><b>${ok.length}</b><span>Confirmed orders</span></div><div class="card st"><b>${fmt(sales)}</b><span>Confirmed sales</span></div><div class="card st"><b style="color:#8a6100">${fmt(pendCash())}</b><span>Pending cash</span></div><div class="card st"><b style="color:#1d7a46">${fmt(gotCash())}</b><span>Received cash</span></div><div class="card st"><b style="color:#1d7a46">${fmt(profitDone())}</b><span>Profit earned (delivered)</span></div><div class="card st"><b>${fmt(profitWay())}</b><span>Profit on the way</span></div></div>
<div class="row"><div class="card"${newPay().length?' style="border-color:#bfe3cc;background:#f1faf4"':''}><h3 style="margin-bottom:14px">New payment</h3>${newPay().length?payRows(newPay())+'<p style="margin-top:14px"><button class="btn" data-a="ack">Got it</button></p>':'<p class="mut">No new payment.</p>'}</div><div class="card"><h3 style="margin-bottom:14px">Received payments</h3>${payRows(PY.slice(0,5))||'<p class="mut">No payments received yet.</p>'}${PY.length>5?'<p style="margin-top:12px"><button class="btn l" data-v="pay">See all</button></p>':''}</div></div>
<div class="row"><div class="card"><h3 style="margin-bottom:14px">Low stock</h3>${low.map(p=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee"><span>${e(p.name)}</span><b style="color:${p.stock?'#8a6100':'#c62f45'}">${p.stock?p.stock+' left':'Sold out'}</b></div>`).join('')||'<p class="mut">All live products have enough stock.</p>'}</div>
<div class="card"><h3 style="margin-bottom:14px">Recent orders</h3>${OR.slice(0,5).map(o=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee"><span>#${e(o.id)}<br><small class="mut">${e(o.customer)} · ${oState(o)}</small></span><b>${fmt(o.amount)}</b></div>`).join('')||'<p class="mut">No orders yet.</p>'}</div></div>`}

/* product list */
function prod(){return `<div class="card"><div class="tw"><table class="pt"><thead><tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Purchase / profit</th><th>Stock</th><th>Status</th><th></th></tr></thead><tbody>${MP.map(p=>`<tr><td><img class="th" src="${e(img(p.image,120))}" alt=""></td><td><b>${e(p.name)}</b><br><small class="mut">${p.size_type==='none'?'No sizes':(p.sizes||[]).map(e).join(', ')}${(p.colors||[]).length?' · '+p.colors.map(c=>e(c.n)).join(', '):''}<br>Pay: ${[p.pay_cod!==false?'Cash on Delivery':'',p.pay_online?'UPI / Card':''].filter(Boolean).join(' + ')}</small></td><td>${e(p.category)}</td><td>${fmt(p.price)}${+p.old_price?` <s class="mut">${fmt(p.old_price)}</s>`:''}</td><td>${COST[p.id]==null?'<button class="chip rd" data-a="pedit" data-id="'+p.id+'">Add purchase price</button>':fmt(COST[p.id])+'<br><small style="color:'+(p.price-COST[p.id]<0?'#c62f45':'#1d7a46')+'"><b>'+(p.price-COST[p.id]<0?'−':'+')+fmt(Math.abs(p.price-COST[p.id]))+' / sale</b></small>'}</td><td><span class="chip ${p.stock===0?'rd':'g'}" data-a="stk" data-id="${p.id}">${p.stock==null?'—':p.stock}</span></td><td>${pchip(p)}${p.status==='rejected'&&p.reject_reason?`<br><small style="color:#c62f45">${e(p.reject_reason)}</small>`:''}</td><td class="ac"><button data-a="pedit" data-id="${p.id}">Edit</button><button class="dl" data-a="pdel" data-id="${p.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="8" class="mut">You have not added any products yet. Tap “+ Add product”.</td></tr>'}</tbody></table></div></div>`}

/* orders and payments */
let OT='new';
const isDone=o=>o.status==='accepted'&&stat(o)===4,ordList=()=>OT==='done'?OR.filter(isDone):OR.filter(o=>!isDone(o));
const ordCard=o=>{const a=o.address||{};return `<div class="ocard"><div class="oh"><div><b>Order #${e(o.id)}</b><br><small class="mut">${dt(o.created_at)} · ${e(o.payment)}</small></div>${o.status==='accepted'&&o.solo?`<label class="stsel">Delivery status<select data-ss="${e(o.id)}">${SL.map((s,k)=>`<option value="${k}"${stat(o)===k?' selected':''}${k<stat(o)?' disabled':''}>${s}</option>`).join('')}<option value="-1"${stat(o)===4?' disabled':''}>Cancelled</option></select></label>`:`<span class="stt ${o.status==='accepted'?'approved':o.status==='rejected'?'rejected':'pending'}">${oState(o)}</span>`}</div>${o.status==='accepted'&&!o.solo?'<p class="mut" style="margin:0 0 8px">This order also has other items, so Peedya updates its delivery status.</p>':''}${(o.lines||[]).map(l=>`<div class="ln"><span class="lw"><img class="lp" src="${e(img(l.i||(MP.find(p=>+p.id===+l.id)||{}).image||'',120))}" alt=""><span><b>${e(l.n)}</b> × ${l.q}${varTxt(l)?`<br><small class="mut">${varTxt(l)}</small>`:''}</span></span><b>${fmt(l.p*l.q)}</b></div>`).join('')}<div class="ln"><b>Your items total</b><b>${fmt(o.amount)}</b></div>${costMissing(o)?'<div class="ln"><span class="mut">Your profit</span><span class="mut">Add purchase price to see</span></div>':'<div class="ln"><span style="color:#1d7a46">Your profit</span><b style="color:'+(orderProfit(o)<0?'#c62f45':'#1d7a46')+'">'+(orderProfit(o)<0?'−':'')+fmt(Math.abs(orderProfit(o)))+'</b></div>'}<p class="mut" style="margin-top:8px"><b style="color:#111">Ship to:</b> ${e(o.customer)} · +91 ${e(o.mobile)}<br>${e(a.a1)}${a.a2?', '+e(a.a2):''}${a.l?', '+e(a.l):''}, ${e(a.c)}, ${e(a.s)} – ${e(a.p)}</p></div>`};
const ordListHtml=()=>{const l=ordList();return l.length?l.map(ordCard).join(''):`<div class="card"><p class="mut">${OT==='done'?'No delivered orders yet.':'No new orders right now.'}</p></div>`};
function ord(){const nn=OR.filter(o=>o.status==='accepted'&&!isDone(o)).length,dn=OR.filter(isDone).length;return `<div class="otabs"><button type="button" data-ot="new" class="${OT==='new'?'on':''}">New orders <i>${nn}</i></button><button type="button" data-ot="done" class="${OT==='done'?'on':''}">Delivered <i>${dn}</i></button></div><div id="olist" class="olist">${ordListHtml()}</div>`}
function pay(){const ok=OR.filter(o=>o.status==='accepted'),del=ok.filter(o=>stat(o)===4),prog=ok.filter(o=>stat(o)<4),wait=OR.filter(o=>o.status==='pending'),sum=l=>l.reduce((a,o)=>a+ +o.amount,0),b=S.bank||{};
return `<div class="note">These amounts are the value of <b>your products</b> in each order (before any Peedya fee). Payouts are settled by the Peedya team to the details saved below.</div>
<div class="g4"><div class="card st"><b>${fmt(sum(del))}</b><span>Delivered (${del.length})</span></div><div class="card st"><b>${fmt(sum(prog))}</b><span>On the way (${prog.length})</span></div><div class="card st"><b>${fmt(sum(wait))}</b><span>Awaiting confirmation (${wait.length})</span></div><div class="card st"><b style="color:#8a6100">${fmt(pendCash())}</b><span>Pending cash</span></div><div class="card st"><b style="color:#1d7a46">${fmt(gotCash())}</b><span>Received cash</span></div></div>
${newPay().length?'<div class="note" style="background:#f1faf4;border-color:#bfe3cc;color:#1d5c37"><b>New payment:</b> '+newPay().map(x=>fmt(x.amount)+' on '+dt(x.paid_at)).join(', ')+' <button class="btn" style="margin-left:10px" data-a="ack">Got it</button></div>':''}
<div class="row"><div class="card"><h3 style="margin-bottom:14px">Payout details</h3><p>UPI: <b>${e(S.upi||'—')}</b></p><p style="margin-top:6px">Bank: <b>${b.a?e(b.h)+' · ••••'+e(String(b.a).slice(-4))+' · '+e(b.i):'—'}</b></p><p style="margin-top:14px"><button class="btn l" data-v="set">Change in Settings</button></p></div>
<div class="card"><h3 style="margin-bottom:14px">Received payments</h3>${payRows(PY)||'<p class="mut">No payments received yet.</p>'}</div>
<div class="card"><h3 style="margin-bottom:14px">Order payments</h3>${OR.filter(o=>o.status!=='rejected').slice(0,30).map(o=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee"><span>#${e(o.id)}<br><small class="mut">${dt(o.created_at)} · ${oState(o)}</small></span><b>${fmt(o.amount)}</b></div>`).join('')||'<p class="mut">No payments yet.</p>'}</div></div>`}

/* settings */
function set(){return `<div class="card" style="max-width:820px">${sellerFields('s',S,true)}<div class="err" id="se"></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="sset">Save changes</button><button class="btn l" data-a="lout">Log out</button></div></div>`}
function bindSet(){digits(['smb','sp','sba'])}
async function saveSet(b){const er=$('#se');er.textContent='';const v=readSeller('s',true);if(v.err)return er.textContent=v.err;b.disabled=true;const r=await sb.from('sellers').update(v.row).eq('user_id',U.id).select('*').single();b.disabled=false;if(r.error)return er.textContent=r.error.message;S=r.data;toast('Saved');go('set')}

/* ---------- add / edit product ---------- */
const blank=()=>({id:null,name:'',category:'',price:'',cost:'',cf:'',dm:'free',df:'',old:'',stock:'',imgs:['','',''],st:'none',sizes:[],colors:[],desc:'',status:null,cod:true,onl:false});
const fromRow=p=>({id:p.id,name:p.name,category:p.category,price:p.price,cost:COST[p.id]==null?'':COST[p.id],cf:+p.cod_fee||'',dm:+p.delivery_fee>0?'fee':'free',df:+p.delivery_fee||'',old:+p.old_price||'',stock:p.stock==null?'':p.stock,imgs:[...(p.images&&p.images.length?p.images:[p.image]),'','',''].slice(0,3),st:p.size_type||'none',sizes:[...(p.sizes||[])],colors:(p.colors||[]).map(c=>({n:c.n,h:c.h})),desc:p.description||'',status:p.status,cod:p.pay_cod!==false,onl:!!p.pay_online});
function add(){const f=FM;
if(!CATS.length)return '<div class="note">The admin has not created any categories yet, so products cannot be added right now. Sellers cannot create categories. Please check back soon.</div>';
return `<div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h2 style="margin:0">${f.id?'Edit product':'Add product'}</h2><button class="lnk" data-a="pcancel" aria-label="Close" style="font-size:22px;text-decoration:none">✕</button></div>${f.id?`<div class="note">Editing <b>${e(f.name||'product')}</b>. After you submit, it is sent to the admin again and stays hidden from the store until it is approved.</div>`:'<div class="note">Every product is reviewed by the Peedya admin first. Once approved, it appears in the store automatically.</div>'}
<h3 class="sec">Basic details</h3>
<label>Product name <span class="req">*</span><input id="pn" maxlength="80" value="${e(f.name)}" placeholder="e.g. Cotton printed kurti"></label>
<div class="row"><label>Category <span class="req">*</span><select id="pc"><option value="">Select category</option>${CATS.map(c=>`<option${c===f.category?' selected':''}>${e(c)}</option>`).join('')}</select><div class="hint">Only categories created by the admin are available.</div></label><label>Stock quantity <span class="req">*</span><input id="ps" type="number" min="0" step="1" inputmode="numeric" value="${e(f.stock)}" placeholder="How many do you have?"></label></div>
<div class="row"><label>Selling price (₹) <span class="req">*</span><input id="pp" type="number" min="1" step="any" inputmode="decimal" value="${e(f.price)}"></label><label>MRP / old price (₹)<input id="po" type="number" min="1" step="any" inputmode="decimal" value="${e(f.old)}" placeholder="Optional, shows a discount"></label></div>
<div class="row"><label>Purchase price (₹) <span class="req">*</span><input id="pcp" type="number" min="0.01" step="any" inputmode="decimal" value="${e(f.cost)}" placeholder="What this product costs you"><div class="hint">Your own cost: what you paid to buy or make one piece. Only you and the Peedya admin can see it, customers never do. It is used to work out your profit when this product sells.</div></label><label>Your profit per sale<div class="profit" id="ppr">—</div><div class="hint">Selling price minus purchase price.</div></label></div>
<h3 class="sec">Photos <span class="mut" style="font-weight:400">(first photo is required)</span></h3>
<div class="multi"><label>Select up to 3 photos at once<input id="pfm" type="file" accept="image/*" multiple></label><div class="hint">Tap once and pick all your photos together. They fill Photo 1, 2 and 3 in the order you choose (the first is the main photo). You can still change any single photo below.</div></div>
<div class="slots">${[0,1,2].map(k=>`<div class="slot"><label>Photo ${k+1}${k?' (optional)':' (main) *'}<input id="pi${k}" value="${e(f.imgs[k]||'')}" placeholder="https://… or upload"></label><div class="slotr"><img class="pv" id="pv${k}" src="${e(f.imgs[k]?img(f.imgs[k],200):'')}" alt=""><input id="pf${k}" type="file" accept="image/*"></div></div>`).join('')}</div>
<h3 class="sec">Size</h3>
<label>Size type<select id="pst"><option value="none"${f.st==='none'?' selected':''}>No sizes</option><option value="letters"${f.st==='letters'?' selected':''}>Letters (S, M, L, XL …)</option><option value="numbers"${f.st==='numbers'?' selected':''}>Numbers (6, 7, 8, 9 …)</option></select></label><div id="szc"></div>
<h3 class="sec">Colours</h3>
<div class="addr"><label>Colour name<input id="cn" maxlength="20" placeholder="e.g. Navy blue"></label><label style="flex:none;min-width:0">Pick colour<input id="ch" type="color" value="#111111"></label><button class="btn l" type="button" data-a="cadd">+ Add colour</button></div><div class="chips" id="clc"></div>
<h3 class="sec">Payment options</h3>
<p class="hint" style="margin:-4px 0 6px">Choose how buyers can pay for this product.</p>
<label class="tg"><input type="checkbox" id="pcod"${f.cod?' checked':''}><span><b>Cash on Delivery</b><small>The buyer pays in cash when the order arrives.</small></span></label>
<label id="pcfw" style="margin:-4px 0 12px 14px">Extra charge for Cash on Delivery (₹ per piece)<input id="pcf" type="number" min="0" step="1" inputmode="numeric" value="${e(f.cf)}" placeholder="e.g. 20 or 30 (empty = no extra charge)"><div class="hint">Added to the price only when the buyer chooses Cash on Delivery, for every piece they order. Online payment (UPI / Card) is not charged extra. Changing it sends the product for approval again.</div></label>
<label>Delivery charge<select id="pdt"><option value="free">No delivery charge (free delivery)</option><option value="fee"${f.dm==='fee'?' selected':''}>Add a delivery charge</option></select></label>
<label id="pdfw" style="margin:-4px 0 12px 14px">Delivery charge amount (₹)<input id="pdf" type="number" min="1" step="1" inputmode="numeric" value="${e(f.df)}" placeholder="e.g. 40"><div class="hint">Charged once for this product in an order, whatever the quantity. The buyer sees it at checkout.</div></label>
<label class="tg"><input type="checkbox" id="ponl"${f.onl?' checked':''}><span><b>UPI / Card (online payment)</b><small>The buyer pays online at checkout. Peedya collects the payment and pays it out to you.</small></span></label>
<div class="hint" id="pnote" style="margin-top:8px"></div>
<h3 class="sec">Description</h3>
<label>Product description <span class="req">*</span><textarea id="pd" maxlength="1500" placeholder="Write a clear description: what it is, material, fit and size guide, what is in the box and care instructions. Put each feature on a new line.">${e(f.desc)}</textarea><div class="hint" id="dc"></div></label>
<div class="err" id="fe"></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" data-a="psub">${f.id?'Save &amp; send for approval':'Submit for approval'}</button><button class="btn l" data-a="pcancel">Cancel</button></div></div>`}
function openForm(){if(!CATS.length)return toast('The admin has not created any categories yet, so products cannot be added right now.',1);$('#mc').innerHTML=add();$('#md').classList.add('open');bindForm()}
function closeForm(){$('#md').classList.remove('open')}
function drawSz(){const f=FM,t=f.st,box=$('#szc');if(!box)return;
if(t==='none'){box.innerHTML='<p class="hint">No size options. Customers will not be asked to choose a size.</p>';return}
const pre=PRE[t],all=[...pre,...f.sizes.filter(x=>!pre.includes(x))];
box.innerHTML=`<div class="hint" style="margin-top:8px">Tap to select the sizes you sell:</div><div class="chips">${all.map(x=>`<button type="button" class="sz${f.sizes.includes(x)?' on':''}" data-a="sz" data-s="${e(x)}">${e(x)}</button>`).join('')}</div><div class="addr"><label>Add another size (${t==='letters'?'letters only, like FREE or 4XL':'numbers only, like 13 or 7.5'})<input id="szn" maxlength="6" autocapitalize="characters"></label><button class="btn l" type="button" data-a="szadd">+ Add size</button></div>`}
function drawCl(){const c=$('#clc');if(c)c.innerHTML=FM.colors.map((x,i)=>`<span class="cc"><i style="background:${e(x.h)}"></i>${e(x.n)}<button type="button" data-a="clrm" data-i="${i}" aria-label="Remove ${e(x.n)}">×</button></span>`).join('')||'<span class="hint">No colours added. Add each colour you sell, customers will pick one.</span>'}
async function upImg(file){const im=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=r.result};r.onerror=rej;r.readAsDataURL(file)});
const k=Math.min(1,1000/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);
const b=await new Promise(res=>c.toBlob(res,'image/jpeg',.85)),path=Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.jpg';
const u=await sb.storage.from('product-images').upload(path,b,{contentType:'image/jpeg'});if(u.error)throw u.error;
return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl}
function bindForm(){const f=FM;if(!$('#pn'))return;
const upd=(id,k,fn)=>{const el=$('#'+id);if(el)el.oninput=el.onchange=()=>{f[k]=fn?fn(el.value):el.value}};
upd('pn','name');upd('pc','category');upd('ps','stock');upd('pp','price');upd('po','old');upd('pcp','cost');
const pr=()=>{const s=+f.price,c=+f.cost,el=$('#ppr');if(!(s>0)||!(c>0)){el.textContent='—';el.className='profit';return}const d=Math.round((s-c)*100)/100;el.textContent=(d<0?'−':'')+fmt(Math.abs(d))+(d<0?' (loss)':'');el.className='profit '+(d<0?'neg':'pos')};$('#pp').addEventListener('input',pr);$('#pcp').addEventListener('input',pr);pr();
const d=$('#pd'),dc=()=>{const n=d.value.trim().length;$('#dc').textContent=n+' / 1500 characters'+(n<40?' (at least 40 needed)':'')};d.oninput=()=>{f.desc=d.value;dc()};dc();
const pn=()=>{const m=$('#pnote');m.style.color=f.cod||f.onl?'#6b6b6b':'#c62f45';m.textContent=f.cod&&f.onl?'Buyers can choose Cash on Delivery or UPI / Card.':f.onl?'Only UPI / Card is on. Buyers will see that Cash on Delivery is not available for this product.':f.cod?'Buyers can only pay by Cash on Delivery.':'Turn on at least one payment option.'};
const dfx=()=>{const on=f.dm==='fee';$('#pdfw').hidden=!on;$('#pdf').disabled=!on};$('#pdt').onchange=ev=>{f.dm=ev.target.value;dfx()};$('#pdf').oninput=ev=>{f.df=ev.target.value.trim()};dfx();
const cfx=()=>{$('#pcf').disabled=!f.cod;$('#pcfw').style.opacity=f.cod?1:.5};$('#pcf').oninput=ev=>{f.cf=ev.target.value.trim()};$('#pcod').onchange=ev=>{f.cod=ev.target.checked;pn();cfx()};cfx();$('#ponl').onchange=ev=>{f.onl=ev.target.checked;pn()};pn();
$('#pst').onchange=ev=>{f.st=ev.target.value;f.sizes=[];drawSz()};drawSz();drawCl();
$('#pfm').onchange=async ev=>{const fs=[...ev.target.files],er=$('#fe');ev.target.value='';if(!fs.length)return;const use=fs.slice(0,3);for(let k=0;k<use.length;k++){er.style.color='#6b6b6b';er.textContent='Uploading photo '+(k+1)+' of '+use.length+'…';try{f.imgs[k]=await upImg(use[k]);$('#pi'+k).value=f.imgs[k];$('#pv'+k).src=f.imgs[k]}catch(x){er.style.color='';er.textContent='Upload failed for photo '+(k+1)+': '+(x.message||x);return}}er.style.color='';er.textContent=fs.length>3?'Only the first 3 photos were used.':''};
[0,1,2].forEach(k=>{$('#pi'+k).oninput=ev=>{f.imgs[k]=ev.target.value.trim();$('#pv'+k).src=f.imgs[k]?img(f.imgs[k],200):''};
$('#pf'+k).onchange=async ev=>{const fl=ev.target.files[0];if(!fl)return;const er=$('#fe');er.style.color='#6b6b6b';er.textContent='Uploading photo '+(k+1)+'…';
try{f.imgs[k]=await upImg(fl);$('#pi'+k).value=f.imgs[k];$('#pv'+k).src=f.imgs[k];er.textContent=''}catch(x){er.style.color='';er.textContent='Upload failed: '+(x.message||x)}}})}
function addSize(){const f=FM,i=$('#szn'),v=i.value.trim().toUpperCase(),ok=f.st==='letters'?/^\d?[A-Z]{1,5}$/.test(v):/^\d{1,3}(\.5)?$/.test(v),er=$('#fe');
if(!ok){er.textContent=f.st==='letters'?'Size must be letters, like S, XL, FREE or 4XL.':'Size must be a number, like 13 or 7.5.';return}
if(f.sizes.length>=20){er.textContent='You can add up to 20 sizes.';return}
er.textContent='';if(!f.sizes.includes(v))f.sizes.push(v);drawSz()}
function addColor(){const f=FM,n=$('#cn').value.trim().replace(/\s+/g,' '),er=$('#fe');
if(!/^[A-Za-z][A-Za-z ]{1,19}$/.test(n)){er.textContent='Colour name should be 2 to 20 letters, like Navy blue.';return}
if(f.colors.some(c=>c.n.toLowerCase()===n.toLowerCase())){er.textContent='That colour is already added.';return}
if(f.colors.length>=12){er.textContent='You can add up to 12 colours.';return}
er.textContent='';f.colors.push({n:n[0].toUpperCase()+n.slice(1),h:$('#ch').value});$('#cn').value='';drawCl()}
async function submitProduct(btn){const f=FM,er=$('#fe');er.style.color='';er.textContent='';
const clean=s=>String(s||'').replace(/[<>"]/g,'').trim(),name=clean(f.name),price=+f.price,old=f.old===''?0:+f.old,stock=f.stock===''?NaN:+f.stock,desc=String(f.desc||'').replace(/[<>]/g,'').trim(),imgs=f.imgs.map(s=>s.trim()).filter(Boolean);
if(name.length<3)return er.textContent='Enter the product name (at least 3 characters).';
if(!CATS.includes(f.category))return er.textContent='Select a category.';
if(!(price>0)||price>1000000)return er.textContent='Enter a valid selling price.';
if(f.cost===''||f.cost==null){er.textContent='Enter the purchase price.';return popup('Please enter the Purchase price.\n\nIt is needed to calculate your profit, and only you and the admin can see it.','pcp')}
const cost=Math.round(+f.cost*100)/100;if(!(cost>0)||cost>10000000){er.textContent='Enter a valid purchase price.';return popup('The Purchase price is not valid. Please enter your cost as a number greater than 0.','pcp')}
if(cost>price&&!confirm('The purchase price (₹'+cost+') is higher than the selling price (₹'+price+'). You will lose money on every sale. Continue?'))return;
if(old&&!(old>price))return er.textContent='MRP must be higher than the selling price (or leave it empty).';
if(!Number.isInteger(stock)||stock<0||stock>100000)return er.textContent='Enter the stock quantity as a whole number (0 or more).';
if(!f.imgs[0]||!imgs.length)return er.textContent='Add at least the main photo.';
if(imgs.some(u=>!/^https:\/\/[^\s"'<>]+$/i.test(u)))return er.textContent='Photo links must start with https://. You can also upload photos.';
if(f.st!=='none'&&!f.sizes.length)return er.textContent='Select at least one size, or choose “No sizes”.';
if(!f.cod&&!f.onl)return er.textContent='Turn on at least one payment option (Cash on Delivery or UPI / Card).';
const dfv=+f.df;if(f.dm==='fee'&&!(dfv>0&&dfv<=999999&&Math.abs(dfv*100-Math.round(dfv*100))<1e-6))return er.textContent='Enter the delivery charge amount, or choose No delivery charge.';
const cfv=String(f.cf==null?'':f.cf).trim(),cf=cfv===''||!f.cod?0:+cfv;if(!(cf>=0&&cf<=999999)||Math.abs(cf*100-Math.round(cf*100))>1e-6)return er.textContent='Enter a valid Cash on Delivery charge (₹0 or more).';
if(desc.length<40)return er.textContent='Write a proper description (at least 40 characters).';
const order=PRE[f.st]||[],sizes=f.st==='none'?[]:[...f.sizes].sort((a,b)=>f.st==='numbers'?a-b:((order.indexOf(a)<0?99:order.indexOf(a))-(order.indexOf(b)<0?99:order.indexOf(b))||a.localeCompare(b)));
const row={name,category:f.category,price,old_price:old||0,image:imgs[0],images:imgs,description:desc,stock,size_type:f.st,sizes,colors:f.colors,pay_cod:!!f.cod,pay_online:!!f.onl,cod_fee:f.cod?cf:0,delivery_fee:f.dm==='fee'?dfv:0};
btn.disabled=true;const r=f.id?await sb.from('products').update(row).eq('id',f.id).select('id'):await sb.from('products').insert({...row,seller_id:U.id}).select('id');
if(r.error){btn.disabled=false;return er.textContent=r.error.message.includes('column')?'Seller feature is not set up yet: run the updated supabase/schema.sql in Supabase.':r.error.message}
const pid=f.id||(r.data&&r.data[0]&&r.data[0].id);f.id=pid;
const rc=await sb.from('product_costs').upsert({product_id:pid,seller_id:U.id,cost},{onConflict:'product_id'});btn.disabled=false;
if(rc.error){er.textContent='The product was saved, but the purchase price could not be saved: '+rc.error.message+' (run the updated supabase/schema.sql)';return popup('The product was saved, but the purchase price could not be saved. Please try Save again.')}
FM=null;closeForm();toast('Sent to admin for approval');await loadAll();go('prod')}

/* ---------- events ---------- */
document.addEventListener('change',async ev=>{const t=ev.target;if(t.dataset&&t.dataset.ss!==undefined){if(+t.value===-1&&!confirm('Cancel this order?\n\nThe stock goes back and this cannot be undone.')){await loadAll();return go(V,true)}const r=await sb.rpc('seller_set_stage',{oid:t.dataset.ss,st:+t.value});if(r.error){toast(r.error.message,1)}else toast('Delivery status updated');await loadAll();go(V,true)}});
document.addEventListener('click',async ev=>{const t=ev.target;
const ot=t.closest&&t.closest('[data-ot]');if(ot){if(OT!==ot.dataset.ot){OT=ot.dataset.ot;$$('.otabs button').forEach(b=>b.classList.toggle('on',b.dataset.ot===OT));const L=$('#olist');L.classList.add('swap');setTimeout(()=>{L.innerHTML=ordListHtml();L.classList.remove('swap')},140)}return}
if(t.id==='md')return $('#md').classList.remove('open');
if(t.closest('#mn'))return $('#sb').classList.toggle('open');
if(t.closest('#lo'))return sb.auth.signOut();
const v=t.closest('[data-v]');if(v)return go(v.dataset.v);
const b=t.closest('[data-a]');if(!b)return;const a=b.dataset.a,id=b.dataset.id,p=id&&MP.find(x=>String(x.id)===id);
if(a==='sz'){const f=FM,s=b.dataset.s;f.sizes=f.sizes.includes(s)?f.sizes.filter(x=>x!==s):[...f.sizes,s];drawSz()}
else if(a==='szadd')addSize();
else if(a==='cadd')addColor();
else if(a==='clrm'){FM.colors.splice(+b.dataset.i,1);drawCl()}
else if(a==='psub')submitProduct(b);
else if(a==='padd'){FM=blank();openForm()}
else if(a==='pcancel'){FM=null;closeForm()}
else if(a==='pedit'&&p){FM=fromRow(p);openForm()}
else if(a==='ack'){const r=await sb.rpc('seller_ack_payouts');if(r.error)return toast(r.error.message,1);await loadAll();go(V,true)}
else if(a==='pdel'&&p){if(confirm('Delete “'+p.name+'” permanently?')){const r=await sb.from('products').delete().eq('id',p.id);if(r.error)return toast(r.error.message,1);toast('Product deleted');await loadAll();go('prod')}}
else if(a==='stk'&&p){const n=prompt('Stock quantity for “'+p.name+'”',p.stock==null?'':p.stock);if(n===null)return;const q=n.trim()===''?NaN:+n;if(!Number.isInteger(q)||q<0||q>100000)return toast('Enter a whole number, 0 or more',1);const r=await sb.from('products').update({stock:q}).eq('id',p.id);if(r.error)return toast(r.error.message,1);toast('Stock updated');await loadAll();go('prod')}
else if(a==='sset')saveSet(b);
else if(a==='lout')sb.auth.signOut()});

if(sb){sb.auth.onAuthStateChange((ev,ss)=>{if(ev==='PASSWORD_RECOVERY'){RECOVERY=true;setTimeout(recoverUI,0);return}const id=ss&&ss.user?ss.user.id:null;if(id!==(U&&U.id))setTimeout(boot,0)});
document.addEventListener('visibilitychange',async()=>{if(document.hidden||!U||!S||$('#md').classList.contains('open')||$('#app').hidden)return;await loadAll();go(V,1)})}
boot();
