/*!
 * WebKit storefront  (assets/js/app.js)
 * Plain JavaScript, no build step. Data comes from Supabase (see assets/js/config.js).
 *
 * Contents
 *   1. Helpers, data model and Supabase client
 *   2. Account session + live data (auth, orders, products, categories)
 *   3. Navigation and page sections (hero, featured, categories, products, reviews, FAQ)
 *   4. Cart (localStorage) and product view
 *   5. Search, shop page, checkout (OTP) and profile
 *   6. Scroll animations and start-up
 */

document.addEventListener('error',function(e){var t=e.target;if(t&&t.tagName==='IMG')t.style.visibility='hidden'},true);document.addEventListener('load',function(e){var t=e.target;if(t&&t.tagName==='IMG'&&t.style.visibility==='hidden')t.style.visibility=''},true);
(function(){
var $=function(s,e){return(e||document).querySelector(s)},$$=function(s,e){return[].slice.call((e||document).querySelectorAll(s))};
var U=function(id,w){return/^(https?:|data:|\/|\.)/.test(id)?id:'https://images.unsplash.com/photo-'+id+'?auto=format&fit=crop&w='+(w||900)+'&q=80'};
var P=[];
var CATS=[];
var CFG=window.WK_CONFIG||{},CT=window.WK_CONTENT||{},sb=null;try{if(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&window.supabase)sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY)}catch(e){}
var LD=!!sb;
try{var _d=JSON.parse(localStorage.getItem('wk_sb_cache')||'null');if(_d&&_d.p&&_d.p.length){P=_d.p;if(_d.c&&_d.c.length)CATS=_d.c}}catch(e){}
P=P.filter(function(p){return !p.h});
var NAV=[['Home','home'],['Categories','categories'],['Products','products'],['Best Sellers','best'],['Reviews','reviews'],['About','about'],['FAQ','faq']];
var fmt=function(n){return'₹'+n.toLocaleString('en-IN')};
var ic={cart:'<svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 016 0"/></svg>',heart:'<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z"/></svg>',arrow:'<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'};
var stars=function(r,c){return'<div class="st">'+'★'.repeat(Math.round(r))+'<span style="color:#ddd">'+'★'.repeat(5-Math.round(r))+'</span><small>'+r+(c?' ('+c+')':'')+'</small></div>'};
var toast=function(t){var e=$('#ts');e.textContent=t;e.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(function(){e.classList.remove('show')},2200)};
var store=function(k,v){try{if(v===undefined)return JSON.parse(localStorage.getItem(k));localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}};
var cart=store('wk_cart')||[],favs=store('wk_fav')||[];
var byId=function(id){return P.filter(function(p){return p.id==id})[0]};
var img=function(p,w){return'<img loading="lazy" src="'+U(p.i,w)+'" alt="'+p.n+'">'};
function card(p,o){var so=p.s===false;return'<article class="card" data-open="'+p.id+'">'+img(p,1000)+(so?'<span class="tag">SOLD OUT</span>':'')+'<div class="ov2"><div class="ac"><div class="info'+(so?' off':'')+'"><b class="in1">'+esc0(p.n)+'</b><span class="in2"><strong>'+fmt(p.p)+'</strong>'+(p.o?'<s>'+fmt(p.o)+'</s>':'')+'<i>\u2605 '+(Math.round(p.r*10)/10)+'</i></span></div><button class="fav cartb'+(cart.some(function(c){return c.id==p.id})?' in':'')+'" data-add="'+p.id+'"'+(so?' disabled':'')+' aria-label="Add to cart">'+ic.cart+'</button></div></div></article>'}
/* nav */
$('#menu').innerHTML=NAV.map(function(n){return'<a href="#'+n[1]+'" data-s="'+n[1]+'">'+n[0]+'</a>'}).join('');
$('#mm').innerHTML=NAV.map(function(n){return'<a href="#'+n[1]+'">'+n[0]+'</a>'}).join('');
var hd=$('#hd');
function onScroll(){hd.classList.toggle('sc',scrollY>30);hd.classList.toggle('top',scrollY<=30)}
addEventListener('scroll',onScroll,{passive:true});onScroll();
function mm(o){$('#mnt').textContent=o?'CLOSE':'MENU';$('#mm').classList.toggle('open',o);document.body.classList.toggle('lock',o);document.body.classList.toggle('mmo',o);$('#bgi').innerHTML=o?'<path d="M6 6l12 12M18 6L6 18"/>':'<path d="M4 8h16M4 16h16"/>'}
$('#bg').onclick=function(){mm(!$('#mm').classList.contains('open'))};
$('#mnu').onclick=$('#bg').onclick;
/* hero: rotating card, live time, optional photo */
var HS=['Shop smart,<br>live better.','Delivered<br>to your door.','Cash on delivery<br>available.'],hsI=0,hsT;
function hgo(d){hsI=(hsI+d+HS.length)%HS.length;$('#hst').innerHTML=HS[hsI];$('#hsn').textContent=(hsI+1<10?'0':'')+(hsI+1);var p=$('#hsp');p.style.transition='none';p.style.width='0';void p.offsetWidth;p.style.transition='width 4s linear';p.style.width='100%'}
function hauto(){clearInterval(hsT);hsT=setInterval(function(){hgo(1)},4000)}
$('#hsl').onclick=function(){hgo(-1);hauto()};$('#hsr').onclick=function(){hgo(1);hauto()};hgo(0);hauto();
function tick(){var d=new Date();$('#tzv').textContent=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}).replace(/\s/g,'').toLowerCase()+' \u2022 '+d.getDate()+' '+d.toLocaleString('en-US',{month:'long'})+', '+d.getFullYear()}
tick();setInterval(tick,30000);
/* hero background word: always fits the screen width */
function fitBig(){var b=$('.h-big'),s=b&&b.firstElementChild,h=$('#home');if(!s||!h)return;s.style.display='inline-block';b.style.fontSize='100px';var w=s.getBoundingClientRect().width;if(w)b.style.fontSize=Math.min(430,100*h.clientWidth*0.96/w)+'px'}
/* hero heading: after "Everything you want," show one word at a time, every 2 seconds */
(function(){var W=['Electronics','Accessories','Gadgets','Kitchen','Appliances','Fashion','Home products','Furniture','Sports'],el=$('#rw'),n=0;if(!el)return;
setInterval(function(){if(document.hidden)return;el.classList.add('out');setTimeout(function(){n=(n+1)%W.length;el.textContent=W[n];el.classList.remove('out')},450)},2000)})();
fitBig();addEventListener('resize',fitBig);addEventListener('load',fitBig);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitBig);
/* slider under Featured Picks: up to 10 photos, each with its own text and link, rotating */
var SL5=[],hsx=0,hsTm,hsJ='';
try{var _h=JSON.parse(localStorage.getItem('wk_sb_cache')||'null');if(_h&&_h.h&&_h.h.length)SL5=_h.h}catch(e){}
function buildSlider(){var s=$('#slider');if(!s)return;var j=JSON.stringify(SL5);s.hidden=!SL5.length;if(j===hsJ)return;hsJ=j;if(hsx>=SL5.length)hsx=0;
$('#bslider').innerHTML=SL5.map(function(x,i){var ls=String(x.title||'').split('|');return'<a href="#" class="bs'+(i==hsx?' on':'')+'" data-bl="'+i+'"><img src="'+U(x.img,1600)+'" alt="" '+(i?'loading="lazy"':'')+'><div class="bt">'+(x.tag?'<small>'+esc0(x.tag)+'</small>':'')+'<b>'+ls.map(esc0).join('<br>')+'</b></div></a>'}).join('');
$('#bdots').innerHTML=SL5.length>1?SL5.map(function(x,i){return'<button data-hs="'+i+'" class="'+(i==hsx?'on':'')+'" aria-label="Slide '+(i+1)+'"></button>'}).join(''):'';sauto()}
function sshow(i){hsx=(i+SL5.length)%SL5.length;$$('.bs').forEach(function(e,k){e.classList.toggle('on',k==hsx)});$$('#bdots button').forEach(function(e,k){e.classList.toggle('on',k==hsx)})}
function sauto(){clearInterval(hsTm);if(SL5.length>1)hsTm=setInterval(function(){if(!document.hidden)sshow(hsx+1)},5000)}
var BN=[],bnJ='';
try{var _b=JSON.parse(localStorage.getItem('wk_sb_cache')||'null');if(_b&&_b.b)BN=_b.b}catch(e){}
function buildPromo(){var c=$('#promo');if(!c)return;var j=JSON.stringify(BN);c.hidden=!BN.length;if(j===bnJ)return;bnJ=j;c.innerHTML=BN.map(function(b,i){return'<a href="#" data-pb="'+i+'"><img src="'+U(b.img,900)+'" alt="" loading="lazy"></a>'}).join('')}
function goBanner(b){var t=b.t,v=b.v;if(t=='category')openShop(v);else if(t=='tab')setF(v,true);else if(t=='product')location.hash='p-'+v;else if(t=='shop')openShop('All');else if(t=='url'){if(/^https?:\/\//.test(v))window.open(v,'_blank','noopener');else if(/^(#|\/(?![\/\\]))/.test(v))location.href=v}}
$('#mm').onclick=function(e){if(e.target.tagName=='A')mm(false)};
addEventListener('resize',function(){if(innerWidth>899)mm(false)});
var secs=NAV.map(function(n){return $('#'+n[1])});
var spy=new IntersectionObserver(function(es){if($('#sp').classList.contains('open'))return;es.forEach(function(e){if(e.isIntersecting)$$('.menu a').forEach(function(a){a.classList.toggle('on',a.dataset.s==e.target.id)})})},{rootMargin:'-45% 0px -50% 0px'});
var navPrev=null;new MutationObserver(function(){var spo=$('#sp').classList.contains('open'),as=$$('.menu a');if(spo){if(navPrev===null){var cu=as.filter(function(a){return a.classList.contains('on')})[0];navPrev=cu?cu.dataset.s:''}as.forEach(function(a){a.classList.toggle('on',a.dataset.s=='products')})}else if(navPrev!==null){var pv=navPrev;navPrev=null;as.forEach(function(a){a.classList.toggle('on',a.dataset.s==pv)})}}).observe($('#sp'),{attributes:true,attributeFilter:['class']});
secs.forEach(function(s){spy.observe(s)});
/* featured / best / categories */


var esc0=function(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};var cnt=function(c){return P.filter(function(p){return p.c==c}).length};

/* filter */
var cur='All',fl=$('#flt'),pill=null,TABS=[],ALL_LBL='All';
try{var _t=JSON.parse(localStorage.getItem('wk_sb_cache')||'null');if(_t&&_t.t)TABS=_t.t;if(_t&&_t.al)ALL_LBL=_t.al}catch(e){}
function buildTabs(){if(cur!='All'&&TABS.indexOf(cur)<0)cur='All';fl.innerHTML='<span class="pill"></span>'+['All'].concat(TABS).map(function(c){return'<button data-f="'+esc0(c)+'"'+(c==cur?' class="on"':'')+'>'+esc0(c=='All'?ALL_LBL:c)+'</button>'}).join('');pill=$('.pill',fl);var fs=$('#fshop');if(fs)fs.innerHTML=TABS.map(function(c){return'<li><a href="#" data-f="'+esc0(c)+'">'+esc0(c)+'</a></li>'}).join('')+'<li><a href="#best">Best Sellers</a></li><li><a href="#" data-f="All">New Arrivals</a></li>';mp()}
function mp(){var b=$('button.on',fl);if(b&&pill){pill.style.left=b.offsetLeft+'px';pill.style.width=b.offsetWidth+'px'}}
var SK='<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
function emptyNote(){return LD&&!P.length?SK:'<p class="note0">'+(sb?'No products here yet. Please check back soon.':'The store is not connected yet. Add your Supabase keys in assets/js/config.js.')+'</p>'}
function render(){var l=P.filter(function(p){return p.ex!==false&&(cur=='All'?p.ia!==false:p.g==cur)}).sort(byPos('pe'));$('#pgrid').innerHTML=l.length?l.map(function(p){return card(p)}).join(''):emptyNote();obs()}
function setF(c,go){if(c==cur&&!go)return;cur=c;$$('button',fl).forEach(function(b){b.classList.toggle('on',b.dataset.f==c)});mp();var g=$('#pgrid');g.classList.add('out');setTimeout(function(){render();g.classList.remove('out')},250);if(go)goTo('products')}
function goTo(id){var e=$('#'+id);scrollTo({top:e.getBoundingClientRect().top+scrollY-(id=='products'?60:0),behavior:'smooth'})}
/* hero buttons (Shop Now / Explore Categories): handled directly so taps always work on phones and narrow windows */
(function(){var hc=$('.h-cta');if(!hc)return;hc.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(!a)return;e.preventDefault();e.stopPropagation();
if(a.hasAttribute('data-shop')){openShop('All');return}
document.body.classList.remove('lock');var t=$('#categories');if(t)scrollTo({top:Math.max(0,t.getBoundingClientRect().top+scrollY-56),behavior:'smooth'})})})();
document.addEventListener('click',function(e){
var th=e.target.closest('[data-th]');if(th){$('#pimg').src=U(th.dataset.th,1200);$$('.thumbs img').forEach(function(x){x.classList.toggle('on',x==th)});return}
var pb=e.target.closest('[data-pb]');if(pb){e.preventDefault();goBanner(BN[+pb.dataset.pb]);return}
var hd=e.target.closest('[data-hs]');if(hd){sshow(+hd.dataset.hs);sauto();return}
var bl=e.target.closest('[data-bl]');if(bl){e.preventDefault();var sl=SL5[+bl.dataset.bl];goBanner({t:sl.t,v:sl.v});return}
var ct=e.target.closest('[data-cat]');if(ct){openShop(ct.dataset.cat);return}
var f=e.target.closest('[data-f]');if(f){e.preventDefault();setF(f.dataset.f,!f.closest('#flt'));return}
var s=e.target.closest('[data-shop]');if(s){e.preventDefault();openShop('All');return}
var tb=e.target.closest('[data-tb]');if(tb){spPanel(tb.dataset.tb);return}
var sc=e.target.closest('[data-sc]');if(sc){SC=sc.dataset.sc;spPanel();rspg();$('#sp').scrollTop=0;return}
var sp=e.target.closest('[data-sp]');if(sp){SP=sp.dataset.sp;spPanel();rspg();$('#sp').scrollTop=0;return}
if(e.target.closest('[data-clr]')){SC='All';SP='all';rspg();return}
if(!e.target.closest('#stm'))spPanel();
if(e.target.closest('header a[href^="#"]')&&$('#sp').classList.contains('open'))closeAll();
var fv=e.target.closest('[data-fav]');if(fv){e.stopPropagation();var id=+fv.dataset.fav,k=favs.indexOf(id);k>-1?favs.splice(k,1):favs.push(id);store('wk_fav',favs);$$('[data-fav="'+id+'"]').forEach(function(b){b.classList.toggle('on',k<0)});toast(k<0?'Added to favorites':'Removed from favorites');return}
var a=e.target.closest('[data-add]');if(a){e.stopPropagation();var pq=byId(+a.dataset.add);if(pq&&hasVar(pq)){toast('Choose '+(pq.sz&&pq.sz.length?'a size':'a colour')+' first');location.hash='#p-'+pq.id;return}add(+a.dataset.add,1);a.classList.add('done');setTimeout(function(){a.classList.remove('done')},1300);return}
var by=e.target.closest('[data-buy]');if(by){e.stopPropagation();var pb2=byId(+by.dataset.buy);if(pb2&&hasVar(pb2)){toast('Choose '+(pb2.sz&&pb2.sz.length?'a size':'a colour')+' first');location.hash='#p-'+pb2.id;return}add(+by.dataset.buy,1);open($('#dr'));return}
var o=e.target.closest('[data-open]');if(o){location.hash='p-'+o.dataset.open;return}
if(e.target.closest('[data-close]')||e.target.id=='ov')closeTop();
});
/* cart */
function save(){store('wk_cart',cart);drawCart()}
function payOpts(){var cod=true,onl=true;cart.forEach(function(c){var p=byId(c.id);if(!p)return;if(p.cod===false)cod=false;if(!p.onl)onl=false});return{cod:cod,onl:onl}}
function curPay(){var o=payOpts();if(CO.pay==='UPI / Card'&&o.onl)return CO.pay;if(CO.pay==='Cash on Delivery'&&o.cod)return CO.pay;return o.cod?'Cash on Delivery':o.onl?'UPI / Card':''}
function payLbl(){return curPay()==='UPI / Card'?'Pay now (UPI / Card)':'Pay on delivery'}
function placeLbl(t){var p=curPay();return p?(p==='UPI / Card'?'Pay & Place Order · ':'Place Order · ')+fmt(t.tot):'Cannot place this order'}
function payRow(title,sub,en,on,val){return'<div class="cod'+(on?' on':'')+(en?'':' off')+'" data-pay="'+val+'"><i></i><div><b>'+title+'</b><span>'+(en?sub:'Not available for the items in your cart')+'</span></div></div>'}
function payHtml(){var o=payOpts(),cur=curPay();if(!o.cod&&!o.onl)return'<div class="demo">Some items in your cart accept only Cash on Delivery and others only online payment, so they cannot be bought together. Please order them separately.</div>';return payRow('Cash on Delivery','Pay in cash when your order arrives'+(codFee()>0?' · extra '+fmt(codFee())+' for Cash on Delivery':''),o.cod,cur==='Cash on Delivery','Cash on Delivery')+(o.onl?payRow('UPI / Card','Pay online with UPI, debit card or credit card',true,cur==='UPI / Card','UPI / Card'):'')}
function payNote(p){var cf=p.cf>0&&p.cod!==false?' <small>(Cash on Delivery adds '+fmt(p.cf)+' per piece)</small>':'';if(p.cod!==false&&p.onl)return'<div class="paynote">Pay by Cash on Delivery or UPI / Card'+cf+'</div>';if(cf)return'<div class="paynote">Pay by Cash on Delivery'+cf+'</div>';if(p.cod===false&&p.onl)return'<div class="paynote warn">Cash on Delivery is not available for this product. Online payment (UPI / Card) only.</div>';return''}
/* calls to the Peedya API running on Cloudflare Workers (API_BASE in assets/js/config.js) */
function apiCall(path,body){var base=String((window.WK_CONFIG||{}).API_BASE||'').replace(/\/$/,'');if(!base)return Promise.reject(new Error('The payment service is not set up yet.'));
return sb.auth.getSession().then(function(x){var t=x&&x.data&&x.data.session?x.data.session.access_token:'';var h={'Content-Type':'application/json'};if(t)h.Authorization='Bearer '+t;return fetch(base+path,{method:'POST',headers:h,body:JSON.stringify(body)})}).then(function(r){return r.json().catch(function(){return{}}).then(function(d){if(!r.ok)throw new Error(d.error||'Something went wrong. Please try again.');return d})})}
function payOnline(t,a,ok,cancel){var fail=function(m){toast(m);cancel&&cancel()};
if(!sb||!(window.WK_CONFIG||{}).API_BASE)return fail('Online payment is not set up yet. Please contact support.');
var items=cart.map(function(c){return{id:c.id,q:c.q}});
apiCall('/create-order',{items:items}).then(function(d){if(!d||!d.order_id)throw new Error('create');return d}).then(function(d){
var go=function(){var rz=new Razorpay({key:d.key_id||(window.WK_CONFIG||{}).RAZORPAY_KEY,amount:d.amount,currency:d.currency,order_id:d.order_id,name:'Peedya',description:'Order payment',prefill:{name:a.name,email:a.email,contact:a.m1},theme:{color:'#111111'},
handler:function(p){apiCall('/verify-payment',{razorpay_order_id:p.razorpay_order_id,razorpay_payment_id:p.razorpay_payment_id,razorpay_signature:p.razorpay_signature}).then(function(v){if(!v||!v.success)throw new Error('verify');ok(p.razorpay_payment_id)}).catch(function(){fail('We could not verify your payment. If money was deducted, contact support with payment ID '+p.razorpay_payment_id)})},
modal:{ondismiss:function(){toast('Payment cancelled');cancel&&cancel()}}});
rz.on('payment.failed',function(x){toast((x&&x.error&&x.error.description)||'Payment failed. Please try again.')});rz.open()};
if(window.Razorpay)return go();var s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=go;s.onerror=function(){fail('Could not load the payment window. Check your internet.')};document.head.appendChild(s)}).catch(function(err){fail(err&&err.message&&err.message!=='create'?err.message:'Could not start the payment. Please try again.')})}
function ck(c){return c.id+'|'+(c.s||'')+'|'+(c.c||'')}
function hasVar(p){return !!((p.sz&&p.sz.length)||(p.col&&p.col.length))}
function vt(c){return(c.s?' · Size '+esc0(c.s):'')+(c.c?' · '+esc0(c.c):'')}
function varHtml(p){var h='';if(p.sz&&p.sz.length)h+='<div class="vsel"><b>Size</b><div class="vopts" id="vsz">'+p.sz.map(function(s){return'<button type="button" class="vo" data-vs="'+esc0(s)+'">'+esc0(s)+'</button>'}).join('')+'</div></div>';if(p.col&&p.col.length)h+='<div class="vsel"><b>Colour: <span id="vcn">Select</span></b><div class="vopts" id="vcl">'+p.col.map(function(c){return'<button type="button" class="vo vc" data-vc="'+esc0(c.n)+'" title="'+esc0(c.n)+'" aria-label="'+esc0(c.n)+'"><i style="background:'+c.h+'"></i></button>'}).join('')+'</div></div>';return h}
function add(id,q,s,c){var k=id+'|'+(s||'')+'|'+(c||''),it=cart.filter(function(x){return ck(x)==k})[0];it?it.q=Math.min(20,it.q+q):cart.push({id:id,q:q,s:s||'',c:c||''});save();var b=$('#cn');b.classList.add('pop');setTimeout(function(){b.classList.remove('pop')},300);toast(byId(id).n+' added to cart')}
function drawCart(){var n=0,t=0;cart=cart.filter(function(c){return byId(c.id)});
$('#ci').innerHTML=cart.length?cart.map(function(c){var p=byId(c.id);n+=c.q;t+=c.q*p.p;return'<div class="ci"><img src="'+U(p.i,200)+'" alt="'+p.n+'"><div><b>'+p.n+'</b><small>'+fmt(p.p)+vt(c)+'</small><div class="q"><button data-q="'+esc0(ck(c))+'" data-d="-1" aria-label="Decrease">−</button><span>'+c.q+'</span><button data-q="'+esc0(ck(c))+'" data-d="1" aria-label="Increase">+</button></div></div><div><b>'+fmt(p.p*c.q)+'</b><button class="rm" data-rm="'+esc0(ck(c))+'">Remove</button></div></div>'}).join(''):'<div class="empty">Your cart is empty.</div>';
$('#cn').textContent=n;$('#sub').textContent=fmt(t);$$('.cartb').forEach(function(x){x.classList.toggle('in',cart.some(function(c){return c.id==x.dataset.add}))})}
$('#ci').onclick=function(e){var q=e.target.closest('[data-q]'),r=e.target.closest('[data-rm]');
if(q){var it=cart.filter(function(c){return ck(c)==q.dataset.q})[0];it.q=Math.min(20,it.q+ +q.dataset.d);if(it.q<1)cart=cart.filter(function(c){return c!=it});save()}
if(r){cart=cart.filter(function(c){return ck(c)!=r.dataset.rm});save()}};
$('#chk').onclick=function(){if(!cart.length)return toast('Add something to your cart first.');checkout()};
function open(el){var wasSp=$('#sp').classList.contains('open');closeAll(1);if(wasSp&&(el.id=='dr'||el.id=='so'||el.id=='chat'))$('#sp').classList.add('open');el.classList.add('open');if(!el.classList.contains('pv')&&el.id!='so')$('#ov').classList.add('open');document.body.classList.add('lock');if(el.id=='pp'&&location.hash!='#profile')history.replaceState(null,'',location.pathname+location.search+'#profile')}
function closeAll(keep){['dr','so','pv','co','pp','sp','chat','ov'].forEach(function(i){$('#'+i).classList.remove('open')});if(!keep){document.body.classList.remove('lock');if(/^#(p-|profile$)/.test(location.hash))history.replaceState(null,'',location.pathname+location.search)}}
$('#cb').onclick=function(){open($('#dr'))};
$('#pf').onclick=function(){PL={sent:false,m:'',otp:''};rpp();open($('#pp'))};
document.addEventListener('click',function(e){var pp=e.target.closest&&e.target.closest('[data-pwp]');if(!pp)return;var pop=$('.pwpop');pop&&pop.remove();pwAskClear();if(pp.dataset.pwp=='set'){PL={sent:false,m:'',otp:''};rpp();open($('#pp'));setTimeout(function(){var bx=$('#pwbox');if(bx){bx.scrollIntoView({behavior:'smooth',block:'center'});var f=$('#spw');f&&f.focus()}},350)}});
document.addEventListener('keydown',function(e){if(e.key=='Escape')closeTop();if(e.key=='Enter'&&e.target&&e.target.id){var go={ckm:'#co [data-act="send"]',ckw:'#co [data-act="pwgo"]',ckw2:'#co [data-act="pwgo"]',plm:'[data-pl="send"]',plw:'[data-pl="pwgo"]',plw2:'[data-pl="pwgo"]',plcn:'[data-pl="clogin"]',plcc:'[data-pl="clogin"]',spw:'[data-pl="pset"]',spw2:'[data-pl="pset"]'}[e.target.id];var bt=go&&$(go);if(bt){e.preventDefault();bt.click()}}});
/* product view */
var HL=['Quality-checked before dispatch','Secure packaging with tracked delivery','7-day easy returns'];
var PR=CT.productReviews||[];
var T={s:'<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',r:'<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0114-5M20 12a8 8 0 01-14 5"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>',t:'<svg viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/></svg>',b:'<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="5"/><path d="M9 13l-2 8 5-3 5 3-2-8"/></svg>'};
function dd(n){var d=new Date();d.setDate(d.getDate()+n);return d.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}
function relHtml(p){return P.filter(function(x){return x.c==p.c&&x.id!=p.id}).concat(P.filter(function(x){return x.c!=p.c}).sort(function(a,b){return b.r-a.r})).slice(0,3).map(function(x){return card(x)}).join('')}
function view(id){var p=byId(id);if(!p)return;var ims=p.ims&&p.ims.length?p.ims:[p.i];SPB=$('#sp').classList.contains('open')?1:($('#pv').classList.contains('open')?SPB:0);
$('#pvg').innerHTML='<div class="pi"><img id="pimg" src="'+U(ims[0],1200)+'" alt="'+p.n+'">'+(ims.length>1?'<div class="thumbs">'+ims.map(function(u,k){return'<img class="'+(k?'':'on')+'" data-th="'+esc0(u)+'" src="'+U(u,200)+'" alt="">'}).join('')+'</div>':'')+'</div><div><div class="crumb">Home / '+p.c+' / '+p.n+'</div><span class="cat">'+p.c+'</span><h2>'+p.n+'</h2><div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">'+stars(p.r,p.rc)+'<span class="vp">✓ Verified Purchase reviews</span></div><div class="pr" style="margin-top:16px"><b>'+fmt(p.p)+'</b>'+(p.o?'<s>'+fmt(p.o)+'</s><span class="dsc">Save '+Math.round((1-p.p/p.o)*100)+'%</span>':'')+'</div><small style="color:var(--mut)">Inclusive of all taxes</small>'+varHtml(p)+payNote(p)+'<div class="pva" style="margin-top:18px"><div class="q" style="margin:0"><button id="qm" aria-label="Decrease">−</button><span id="qv">1</span><button id="qp" aria-label="Increase">+</button></div><button class="btn btn-d" id="pb" style="flex:1"'+(p.s===false?' disabled':'')+'>Buy Now</button><button class="btn btn-l" id="pa" aria-label="Add to cart" style="width:52px;padding:0"'+(p.s===false?' disabled':'')+'>'+ic.cart+'</button></div><div class="stk'+(p.s===false?' out':'')+'">'+(p.s===false?'Currently out of stock':(p.stk!=null&&p.stk<=5?'Only '+p.stk+' left in stock':'In stock · ready to ship'))+'</div><p class="desc">'+p.d+'</p><ul class="hls">'+HL.map(function(h){return'<li>'+h+'</li>'}).join('')+'</ul><div class="dl"><b>Estimated delivery:</b> '+dd(7)+' – '+dd(9)+'<br><span style="color:var(--mut)">'+(p.df>0?'Delivery charge '+fmt(p.df):'Free delivery on this product')+'</span></div><div class="tg"><div>'+T.s+'<span><b>Secure payments</b>Cash on Delivery, UPI / Card</span></div><div>'+T.r+'<span><b>7-day easy returns</b>No questions asked</span></div><div>'+T.t+'<span><b>Fast shipping</b>Tracked to your door</span></div><div>'+T.b+'<span><b>100% genuine</b>Quality checked</span></div></div></div>';
var rh=relHtml(p);$('#rel').innerHTML='<div class="tr"><div><b>10K+</b><span>Happy customers</span></div><div><b>4.9/5</b><span>Average rating</span></div><div><b>100%</b><span>Genuine products</span></div><div><b>7 days</b><span>Easy returns</span></div></div>'+(PR.length?'<h3>Customer reviews</h3><div class="rvw">'+PR.map(function(v){return'<div class="rc">'+stars(v[2],0)+'<p>“'+v[1]+'”</p><div class="who"><div class="av">'+v[0][0]+'</div><div><b>'+v[0]+'</b><span class="vp">✓ Verified Purchase</span></div></div></div>'}).join('')+'</div>':'')+(rh?'<h3>You may also like</h3><div class="grid hs">'+rh+'</div>':'');
var q=1,qv=$('#qv');$('#qm').onclick=function(){q=Math.max(1,q-1);qv.textContent=q};$('#qp').onclick=function(){q=Math.min(p.stk!=null?Math.max(1,Math.min(20,p.stk)):20,q+1);qv.textContent=q};
var vs='',vc='';
if($('#vsz'))$('#vsz').onclick=function(e){var b=e.target.closest('[data-vs]');if(!b)return;vs=b.dataset.vs;$$('#vsz .vo').forEach(function(x){x.classList.toggle('on',x==b)})};
if($('#vcl'))$('#vcl').onclick=function(e){var b=e.target.closest('[data-vc]');if(!b)return;vc=b.dataset.vc;$$('#vcl .vo').forEach(function(x){x.classList.toggle('on',x==b)});$('#vcn').textContent=vc};
function okv(){if(p.sz&&p.sz.length&&!vs){toast('Please choose a size');return false}if(p.col&&p.col.length&&!vc){toast('Please choose a colour');return false}return true}
$('#pa').onclick=function(){if(okv())add(p.id,q,vs,vc)};$('#pb').onclick=function(){if(!okv())return;add(p.id,q,vs,vc);location.hash='';open($('#dr'))};
open($('#pv'));$('#pv').scrollTop=0}
$('#pvx').onclick=function(){var b=SPB;SPB=0;closeAll();if(/^#p-/.test(location.hash))history.back();if(b)open($('#sp'))};
function route(){var m=/^#p-(\d+)$/.exec(location.hash);m?(recView(+m[1]),view(+m[1])):($('#pv').classList.contains('open')&&closeAll(1),$('#pv').classList.remove('open'),!$('#dr').classList.contains('open')&&!$('#so').classList.contains('open')&&!$('#sp').classList.contains('open')&&document.body.classList.remove('lock'))}
addEventListener('hashchange',route);
/* search */
$('#sb').onclick=function(){open($('#so'));$('#si').value='';sr('');setTimeout(function(){$('#si').focus()},300)};
function sr(v){var q=v.trim().toLowerCase().split(/\s+/).filter(Boolean),l;
if(!q.length)l=P.slice(0,3);else{var hit=function(h,t){return h.indexOf(t)>-1||(t.length>3&&t.slice(-1)=='s'&&h.indexOf(t.slice(0,-1))>-1)};
l=P.map(function(p){var nm=(p.n||'').toLowerCase(),hay=(nm+' '+(p.c||'')+' '+(p.g||'')+' '+(p.d||'')+' '+(p.col||[]).map(function(c){return c.n}).join(' ')+' '+(p.sz||[]).join(' ')).toLowerCase(),s=0;
for(var i=0;i<q.length;i++){if(!hit(hay,q[i]))return null;s+=hit(nm,q[i])?3:hit((p.c||'').toLowerCase(),q[i])?2:1}return{p:p,s:s}}).filter(Boolean).sort(function(a,b){return b.s-a.s}).map(function(x){return x.p})}
$('#sr').innerHTML=l.length?l.map(function(p){return card(p)}).join(''):'<p style="color:var(--mut);font-size:18px">No products found.</p>'}
$('#si').oninput=function(){sr(this.value)};
/* reviews */
var R=CT.reviews||[];$('#reviews').hidden=!R.length;
var ri=0,paused=false,RN=R.length,ICO='<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.6-9 9-9 9z"/></svg><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/></svg><svg viewBox="0 0 24 24"><path d="M21 3L3 10l7 3 3 7z"/><path d="M21 3L10 13"/></svg>';
$('#rcards').innerHTML=R.map(function(r){return'<div class="rk"><div class="rh"><span class="qm2">\u201C</span><div class="av">'+r[0][0]+'</div><div><b>'+r[0]+'</b><small>Verified Purchase</small></div></div><div class="stz">'+'\u2605'.repeat(r[2])+'</div><p>'+r[1]+'</p><div class="rf">'+ICO+'</div></div>'}).join('');
function setR(){$$('.rk').forEach(function(el,i){var d=(i-ri+RN)%RN;el.className='rk'+(d==0?' c':d==1?' r':d==RN-1?' l':'')})}
function slide(d){ri=(ri+d+RN)%RN;setR()}
setR();
$('#rn').onclick=function(){slide(1)};$('#rp').onclick=function(){slide(-1)};
var rs=$('#rst'),tx=0;rs.onmouseenter=function(){paused=true};rs.onmouseleave=function(){paused=false};
rs.addEventListener('touchstart',function(e){paused=true;tx=e.touches[0].clientX},{passive:true});
rs.addEventListener('touchend',function(e){var d=e.changedTouches[0].clientX-tx;if(Math.abs(d)>40)slide(d<0?1:-1);setTimeout(function(){paused=false},4000)},{passive:true});
setInterval(function(){if(!paused&&!document.hidden)slide(1)},4500);
/* faq */
var Q=CT.faq||[];
$('#fqs').innerHTML=Q.map(function(q,i){return'<div class="fq rv" data-a="up" style="--d:'+i*.06+'s"><button aria-expanded="false">'+q[0]+ic.plus+'</button><div class="fa"><p>'+q[1]+'</p></div></div>'}).join('');
$('#fqs').onclick=function(e){var b=e.target.closest('button');if(!b)return;var it=b.parentNode,o=it.classList.contains('open');$$('.fq',this).forEach(function(x){x.classList.remove('open');$('.fa',x).style.maxHeight=0;$('button',x).setAttribute('aria-expanded','false')});if(!o){it.classList.add('open');var a=$('.fa',it);a.style.maxHeight=a.scrollHeight+'px';b.setAttribute('aria-expanded','true')}};
/* subscribe */
function subm(){var v=$('#mob').value.replace(/[\s-]/g,''),m=$('#msg');m.className='msg';void m.offsetWidth;
var d=v.length>10?v.replace(/^(?:\+91|91|0)/,''):v;
if(!/^[6-9]\d{9}$/.test(d)){m.className='msg err';m.textContent='Please enter a valid 10-digit Indian mobile number.';return}
if(!sb){m.className='msg err';m.textContent='Subscriptions are not available right now. Please try again later.';return}
var b=$('#sbt');b.disabled=true;
sb.from('subscribers').upsert({mobile:d},{onConflict:'mobile',ignoreDuplicates:true}).then(function(r){b.disabled=false;if(r.error){m.className='msg err';m.textContent='Could not subscribe. Please try again.';return}m.className='msg ok';m.textContent='\ud83c\udf89 You\'re subscribed! Watch out for exciting updates.';$('#mob').value=''})}
$('#sbt').onclick=subm;$('#mob').onkeydown=function(e){if(e.key=='Enter')subm()};
/* featured auto-rotate */
function autoRot(ft){var fpz=false,fid;
function fhold(){fpz=true;clearTimeout(fid);fid=setTimeout(function(){fpz=false},4500)}
['touchstart','wheel','pointerdown','keydown'].forEach(function(ev){ft.addEventListener(ev,fhold,{passive:true})});
ft.addEventListener('mouseenter',function(){fpz=true;clearTimeout(fid)});ft.addEventListener('mouseleave',fhold);
setInterval(function(){if(fpz||document.hidden)return;var rc=ft.getBoundingClientRect();if(rc.bottom<0||rc.top>innerHeight)return;var c=$('.card',ft);if(!c)return;var w=c.offsetWidth+(parseFloat(getComputedStyle(ft).columnGap)||0);if(ft.scrollLeft+ft.clientWidth>=ft.scrollWidth-8)ft.scrollTo({left:0,behavior:'smooth'});else ft.scrollBy({left:w,behavior:'smooth'})},3200)}
autoRot($('#fg'));autoRot($('#bgd'));
/* shop page */
var SC='All',SP='all',SPB=0,SPR=[['all','Any price',0,1e12],['0-99','\u20B90 \u2013 99',0,100],['100-300','\u20B9100 \u2013 300',100,301],['301-500','\u20B9301 \u2013 500',301,501],['501-1000','\u20B9501 \u2013 1,000',501,1001],['1001-2000','\u20B91,001 \u2013 2,000',1001,2001],['2001+','Above \u20B92,000',2001,1e12]],SCATS=['All','Electronics','Kitchen','Fashion','Accessories','Footwear','Books','Beauty'];
function rspg(){var r=SPR.filter(function(x){return x[0]==SP})[0]||SPR[0],l=P.filter(function(p){return(SC=='All'||p.c==SC)&&p.p>=r[2]&&p.p<r[3]}).sort(byPos('ps'));spLabels();$('#spn').textContent=l.length+' product'+(l.length==1?'':'s');$('#spg').innerHTML=l.length?l.map(function(p){return card(p)}).join(''):(P.length?'<p class="note0">No products match these filters. <button type="button" class="stclr" data-clr>Clear filters</button></p>':emptyNote())}
function rsp(){SCATS=['All'].concat(CATS.map(function(c){return c.n}).concat(P.map(function(p){return p.c})).filter(function(c,i,a){return a.indexOf(c)==i&&P.some(function(p){return p.c==c})}));if(SCATS.indexOf(SC)<0)SC='All';
var chev='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
$('#spb').innerHTML='<div class="stb"><button type="button" class="stbn" data-tb="cat"><span><small>Category</small><b id="stc"></b></span>'+chev+'</button><button type="button" class="stbn" data-tb="price"><span><small>Filter by price</small><b id="stp"></b></span>'+chev+'</button></div><div class="stm" id="stm" hidden></div>';rspg()}
function spLabels(){var c=$('#stc'),p=$('#stp');if(c)c.textContent=SC=='All'?'All categories':SC;if(p)p.textContent=(SPR.filter(function(r){return r[0]==SP})[0]||SPR[0])[1]}
function spPanel(k){var m=$('#stm');if(!m)return;if(!k||(m.dataset.k==k&&!m.hidden)){m.hidden=true;m.dataset.k='';$$('.stbn').forEach(function(b){b.classList.remove('on')});return}
m.dataset.k=k;m.innerHTML=k=='cat'?SCATS.map(function(c){var n=c=='All'?P.length:P.filter(function(p){return p.c==c}).length;return'<button type="button" data-sc="'+esc0(c)+'" class="'+(c==SC?'on':'')+'"><span>'+(c=='All'?'All categories':esc0(c))+'</span><small>'+n+'</small></button>'}).join(''):SPR.map(function(r){var n=P.filter(function(p){return(SC=='All'||p.c==SC)&&p.p>=r[2]&&p.p<r[3]}).length;return'<button type="button" data-sp="'+r[0]+'" class="'+(r[0]==SP?'on':'')+'"><span>'+r[1]+'</span><small>'+n+'</small></button>'}).join('');
m.hidden=false;$$('.stbn').forEach(function(b){b.classList.toggle('on',b.dataset.tb==k)})}
function mpS(){var f=$('#spb .filters');if(!f)return;var b=$('button.on',f),p=$('.pill',f);if(b&&p){p.style.left=b.offsetLeft+'px';p.style.width=b.offsetWidth+'px'}}
addEventListener('resize',mpS);
function openShop(c){SC=c||'All';SP='all';rsp();open($('#sp'));$('#sp').scrollTop=0;mpS()}
function closeTop(){if($('#sp').classList.contains('open')&&($('#dr').classList.contains('open')||$('#so').classList.contains('open')||$('#chat').classList.contains('open'))){['dr','so','chat','ov'].forEach(function(i){$('#'+i).classList.remove('open')})}else closeAll()}
/* account session + live data (Supabase) */
/* Customers log in with their mobile number + a password (no SMS). Behind the scenes the number becomes a private login id
   (number@domain). The domain is only a label, set CUSTOMER_EMAIL_DOMAIN in assets/js/config.js if you need another one. */
var MDOM=(window.WK_CONFIG||{}).CUSTOMER_EMAIL_DOMAIN||'peedya.in';
var RM='',RUID='',RPROF=null,RORD=[],MSGS=[],RLOAD=false,_dt,RCARD=null,CSHOW=false,RGUEST=false;
var sess=function(){return RM||null},profOf=function(m){return m&&m==RM?RPROF:null};
function deb(f){clearTimeout(f._t);f._t=setTimeout(f,400)}
function mapO(r){return{id:r.id,t:Date.parse(r.created_at),at:r.accepted_at?Date.parse(r.accepted_at):null,ac:r.status=='pending'?0:r.status=='rejected'?-1:1,st:r.stage,trk:r.tracking_id,pay:r.payment,pref:r.pay_ref,sub:+r.subtotal,sh:+r.shipping,cf:+r.cod_fee||0,tot:+r.total,a:r.address,items:r.items}}
function byPos(k){return function(a,b){return(a[k]||0)-(b[k]||0)||a.id-b.id}}
function mapP(r){var sn=function(s){return String(s==null?'':s).replace(/[<>"]/g,'')};return{id:r.id,n:sn(r.name),c:sn(r.category),g:r.audience,p:+r.price,o:+r.old_price||0,r:+r.rating,rc:r.reviews,i:sn(r.image),ims:(r.images&&r.images.length?r.images:[r.image]).map(sn),d:sn(r.description),sz:Array.isArray(r.sizes)?r.sizes.map(sn):[],col:Array.isArray(r.colors)?r.colors.map(function(c){return{n:sn(c.n),h:/^#[0-9a-fA-F]{6}$/.test(c.h)?c.h:'#999999'}}):[],stk:r.stock==null?null:+r.stock,cod:r.pay_cod!==false,cf:+r.cod_fee||0,df:+r.delivery_fee||0,onl:!!r.pay_online,feat:r.featured,best:r.best_seller,s:r.in_stock,ex:r.in_explore!==false,ia:r.in_all!==false,pe:r.pos_explore||0,ps:r.pos_shop||0,pf:r.pos_featured||0,pb:r.pos_best||0}}
function mobOf(u){if(!u)return'';var em=String(u.email||'').toLowerCase(),sf='@'+String(MDOM).toLowerCase();if(em.slice(-sf.length)==sf){var n=em.slice(0,-sf.length);if(/^[6-9]\d{9}$/.test(n))return n}if(u.is_anonymous&&u.user_metadata&&/^[6-9]\d{9}$/.test(u.user_metadata.mobile||''))return u.user_metadata.mobile;return u.phone?String(u.phone).replace(/^\+?91/,''):''}
function authSet(s){var u=s&&s.user,m=mobOf(u);RGUEST=!!(u&&u.is_anonymous);RUID=u?u.id:'';if(m!==RM){RM=m;RPROF=null;RORD=[];MSGS=[];RLOAD=false}if(RM)loadAcct();chatUI();if($('#pp').classList.contains('open'))rpp()}
function loadAcct(){if(!sb||!RM)return;Promise.all([sb.from('profiles').select('*').eq('user_id',RUID).maybeSingle(),sb.from('orders').select('*').eq('user_id',RUID).order('created_at',{ascending:false}),sb.from('messages').select('*').eq('user_id',RUID).order('created_at'),sb.rpc('get_my_card')]).then(function(x){RCARD=null;var cd=x[3]&&!x[3].error?x[3].data:null;if(cd)RCARD=Array.isArray(cd)?cd[0]:cd;var p=x[0].data;RPROF=p?{name:p.name,m:p.mobile,m2:p.mobile2,email:p.email,a:p.address,since:Date.parse(p.created_at)}:null;RORD=(x[1].data||[]).map(mapO);MSGS=x[2].data||[];RLOAD=true;chatUI();if($('#pp').classList.contains('open'))rpp()}).catch(function(){})}
/* messages (customer <-> store) */
function tmf(t){return new Date(t).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}
function unreadN(){return MSGS.filter(function(m){return m.sender=='admin'&&!m.customer_read}).length}
function chatUI(){var show=!!RM&&(RORD.length>0||MSGS.length>0),u=unreadN();$('#mb').hidden=!show;$('#mbn').textContent=u;$('#mbn').hidden=!u;if($('#chat').classList.contains('open'))rchat()}
function rchat(){var b=$('#cm');b.innerHTML=MSGS.length?MSGS.map(function(m){return'<div class="bb '+(m.sender=='customer'?'me':'ad')+'"><span>'+esc(m.body)+'</span><small>'+tmf(m.created_at)+'</small></div>'}).join(''):'<div class="empty">No messages yet. We will message you here about your order.</div>';b.scrollTop=b.scrollHeight}
function markRead(){if(!unreadN())return;sb.rpc('mark_messages_read').then(function(){MSGS.forEach(function(m){if(m.sender=='admin')m.customer_read=true});chatUI()})}
function loadMsgs(){if(!sb||!RM)return;var n0=MSGS.filter(function(m){return m.sender=='admin'}).length;sb.from('messages').select('*').eq('user_id',RUID).order('created_at').then(function(r){if(r.error)return;MSGS=r.data||[];var n1=MSGS.filter(function(m){return m.sender=='admin'}).length;var op=$('#chat').classList.contains('open');if(n1>n0&&!op)toast('New message from WebKit');chatUI();if(op)markRead()})}
function sendMsg(){var t=$('#cmi'),b=t.value.trim();if(!b||!sb||!RUID)return;$('#cms').disabled=true;sb.from('messages').insert({user_id:RUID,sender:'customer',body:b}).select('*').single().then(function(r){$('#cms').disabled=false;if(r.error){toast('Could not send. Please try again.');return}MSGS.push(r.data);t.value='';rchat()})}
$('#mb').onclick=function(){open($('#chat'));rchat();markRead()};
$('#cms').onclick=sendMsg;$('#cmi').onkeydown=function(e){if(e.key=='Enter'&&!e.shiftKey){e.preventDefault();sendMsg()}};
function sbLoad(){if(!sb)return;Promise.all([sb.from('products').select('*').order('id'),sb.from('categories').select('*').order('sort').order('id'),sb.from('explore_tabs').select('*').order('sort').order('id'),sb.from('hero_slides').select('*').order('sort').order('id'),sb.from('promo_banners').select('*').order('sort').order('id'),sb.from('site_settings').select('*')]).then(function(x){if(x[0].error||x[1].error){LD=false;paint();return}if(!x[2].error)TABS=x[2].data.map(function(t){return t.name});if(x[5]&&!x[5].error){var al=x[5].data.filter(function(s){return s.key=='explore_all_label'})[0];ALL_LBL=al&&al.value?String(al.value).replace(/[<>"]/g,''):'All'}if(!x[3].error){var ns=x[3].data.map(function(s){return{img:s.image,tag:s.tag,title:s.title,t:s.link_type||'none',v:s.link_value||''}});SL5=ns}if(!x[4].error)BN=x[4].data.map(function(b){return{img:b.image,t:b.link_type,v:b.link_value}});LD=false;P=x[0].data.filter(function(r){return r.visible!==false&&(r.status||'approved')==='approved'}).map(mapP);var nc=x[1].data.map(function(c){return{n:c.name,img:c.image,h:c.home_order}});CATS=nc;try{localStorage.setItem('wk_sb_cache',JSON.stringify({p:P,c:CATS,t:TABS,al:ALL_LBL,h:SL5,b:BN}))}catch(e){}paint();if($('#sp').classList.contains('open'))rsp();if(/^#p-/.test(location.hash))route()}).catch(function(){LD=false;paint()})}
/* checkout + profile */
var CO={},ST=['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal','Other state / UT'];
var esc=function(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var fd=function(ts){return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short'})};
var MOB=/^[6-9]\d{9}$/,codFee=function(){var f=0;cart.forEach(function(c){var p=byId(c.id);if(p)f+=(p.cf||0)*c.q});return f},TOT=function(){var sub=0;cart.forEach(function(c){sub+=c.q*byId(c.id).p});var sh=0,seen={};cart.forEach(function(c){var p=byId(c.id);if(p&&!seen[p.id]){seen[p.id]=1;sh+=p.df||0}});var cf=curPay()==='Cash on Delivery'?codFee():0;return{sub:sub,sh:sh,cf:cf,tot:sub+sh+cf}};
function stp(n){return'<div class="stp">'+['Mobile','Details','Confirm'].map(function(l,i){return'<div class="'+(i+1<=n?'on':'')+'"><i>'+(i+1<n?'✓':i+1)+'</i>'+l+'</div>'}).join('<hr>')+'</div>'}
function F(id,l,v,a){return'<label class="f">'+l+'<input id="'+id+'" value="'+esc(v)+'" '+(a||'')+'><em class="fe"></em></label>'}
function chk(id,ok,msg){var l=$('#'+id).closest('.f');l.classList.toggle('bad',!ok);$('.fe',l).textContent=ok?'':msg;return ok}
function checkout(){var m=sess();CO={s:m?2:1,sent:false,m:m||''};rco();open($('#co'));$('#co').scrollTop=0}
function rco(){var h,pf=profOf(CO.m)||{},a=pf.a||{},t=TOT();if(CO.s==3&&RGUEST&&!CO.pwA){CO.pwA=1;pwAskSet()}
if(CO.s==1){var pw=CO.ph==='pw',nw=pw&&!CO.ex;h='<div class="cw one">'+stp(1)+'<div class="cbx"><h2>'+(!pw?'Your mobile number':'Enter your password')+'</h2><p class="sm">'+(!pw?'Enter your mobile number to place your order. No OTP or password is needed.':'+91 '+esc(CO.m)+' already has a password. Enter it to continue with your account, or order as a guest.')+'</p>'+
(!pw?'<label class="f">Mobile number<div class="fld"><span>+91</span><input id="ckm" type="tel" inputmode="numeric" data-num="10" value="'+esc(CO.m)+'" placeholder="Enter 10-digit number"></div></label><button class="btn btn-d" data-act="send">Continue</button>':
'<label class="f">'+(nw?'Create password':'Password')+'<input id="ckw" type="password" autocomplete="'+(nw?'new-password':'current-password')+'" placeholder="'+(nw?'At least 6 characters':'Your password')+'"></label>'+(nw?'<label class="f">Confirm password<input id="ckw2" type="password" autocomplete="new-password" placeholder="Type the password again"></label>':'')+'<button class="btn btn-d" data-act="pwgo">Log in &amp; continue</button><button class="lnk" data-act="guest">Order as a guest instead</button><button class="lnk" data-act="chg">Change number</button>')+
'<div class="fe" id="coe" style="margin-top:12px;text-align:center"></div></div></div>'}
else if(CO.s==2){h='<div class="cw two"><div class="cbx"><h2>Delivery details</h2><p class="sm">Your number: +91 '+esc(CO.m)+' ✓</p><h3 style="margin-top:0">Contact</h3>'+F('ckn','Full name',pf.name,'autocomplete="name"')+F('cke','Email address',pf.email,'type="email" autocomplete="email"')+'<div class="fr">'+F('ck1','Mobile number',CO.m,'readonly')+F('ck2','Alternate mobile number',pf.m2,'type="tel" inputmode="numeric" data-num="10" placeholder="10-digit number"')+'</div><h3>Delivery address</h3>'+F('cka','House / Flat no., Building',a.a1)+F('ckb','Street, Area, Locality',a.a2)+F('ckl','Landmark (optional)',a.l)+'<div class="fr">'+F('ckc','City / Town',a.c)+F('ckp','PIN code',a.p,'inputmode="numeric" data-num="6"')+'</div><label class="f">State<select id="cks"><option value="">Select state</option>'+ST.map(function(x){return'<option'+(a.s==x?' selected':'')+'>'+x+'</option>'}).join('')+'</select><em class="fe"></em></label><h3>Payment method</h3>'+payHtml()+'<button class="btn btn-d" data-act="place" id="plb">'+placeLbl(t)+'</button></div>'+
'<div class="cbx sumb"><h2 style="font-size:20px;margin-bottom:18px">Order summary</h2>'+cart.map(function(c){var p=byId(c.id);return'<div class="sl"><img src="'+U(p.i,200)+'" alt=""><b>'+p.n+'<br><small style="color:var(--mut);font-weight:400">Qty '+c.q+vt(c)+'</small></b><span>'+fmt(p.p*c.q)+'</span></div>'}).join('')+'<div class="tt"><span>Subtotal</span><span>'+fmt(t.sub)+'</span></div><div class="tt"><span>Delivery</span><span>'+(t.sh?fmt(t.sh):'Free')+'</span></div><div class="tt" id="cfr"'+(t.cf?'':' hidden')+'><span>Cash on Delivery charge</span><span id="cfv">'+fmt(t.cf)+'</span></div><div class="tt g"><span id="ptl">'+payLbl()+'</span><span id="ptt">'+fmt(t.tot)+'</span></div></div></div>'}
else{var o=CO.o;h='<div class="cw one">'+stp(3)+'<div class="cbx" style="text-align:center"><div class="ok"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></div><h2>Order placed!</h2><p class="sm">Thank you, '+esc(o.a.name)+'. Your order <b>#'+o.id+'</b> has been placed and is awaiting confirmation from the store.<br>'+(o.pay==='UPI / Card'?'Paid '+fmt(o.tot)+' online (UPI / Card).':'Pay '+fmt(o.tot)+' in cash on delivery.')+' Expected by '+fd(o.t+7*864e5)+' – '+fd(o.t+9*864e5)+'.</p><div class="demo" style="background:#e6f4ea;border-color:#bfe3cb;color:#1e7a43">Your profile has been created with your name and mobile number.</div><button class="btn btn-d" data-act="track">Track Order in Profile</button><button class="lnk" data-act="shop">Continue shopping</button></div></div>'}
$('#cof').innerHTML=h}
function numIn(e){var n=+e.target.dataset.num;if(!n)return;var v=e.target.value.replace(/\D/g,'');if(n==10&&v.length>10&&v.slice(0,2)=='91')v=v.slice(2);e.target.value=v.slice(0,n)}
$('#co').addEventListener('input',numIn);$('#pp').addEventListener('input',numIn);
$('#co').addEventListener('click',function(e){var py=e.target.closest('[data-pay]');if(py){if(py.classList.contains('off'))return;CO.pay=py.dataset.pay;$$('#co [data-pay]').forEach(function(x){x.classList.toggle('on',x==py)});var tt=TOT(),pb=$('#plb');if(pb)pb.textContent=placeLbl(tt);var cr=$('#cfr');if(cr){cr.hidden=!tt.cf;$('#cfv').textContent=fmt(tt.cf);$('#ptt').textContent=fmt(tt.tot)}var pl=$('#ptl');if(pl)pl.textContent=payLbl();return}var b=e.target.closest('[data-act]');if(!b)return;var a=b.dataset.act,er=$('#coe');
if(a=='send'){var m=$('#ckm').value;if(!MOB.test(m)){er.textContent='Please enter a valid 10-digit Indian mobile number.';return}if(!sb){er.textContent='Ordering is not available right now. Please try again later.';return}
b.disabled=true;er.textContent='';custExists(m).then(function(ex){if(ex){b.disabled=false;CO.m=m;CO.ex=true;CO.ph='pw';rco();var f=$('#ckw');f&&f.focus();return}return guestLogin(m).then(function(s){b.disabled=false;authSet(s);CO.m=m;CO.s=2;rco();$('#co').scrollTop=0})}).catch(function(x){b.disabled=false;er.textContent=x.message||'Something went wrong. Please try again.'})}
else if(a=='guest'){b.disabled=true;er.textContent='';guestLogin(CO.m).then(function(s){b.disabled=false;authSet(s);CO.s=2;rco();$('#co').scrollTop=0}).catch(function(x){b.disabled=false;er.textContent=x.message})}
else if(a=='chg'){CO.ph='m';rco()}
else if(a=='pwgo'){var pw=$('#ckw').value,pw2=$('#ckw2');if(pw.length<6){er.textContent='The password must be at least 6 characters.';return}if(pw2&&pw2.value!==pw){er.textContent='The two passwords do not match.';return}b.disabled=true;er.textContent='';custAuth(CO.m,pw,!CO.ex).then(function(s){b.disabled=false;authSet(s);CO.s=2;rco();$('#co').scrollTop=0}).catch(function(x){b.disabled=false;er.textContent=x.message})}
else if(a=='place')place();
else if(a=='track'){rpp();open($('#pp'))}
else if(a=='shop')closeAll()});
function place(){var g=function(i){return $('#'+i).value.trim()},m1=CO.m,m2=g('ck2'),em=g('cke');
var ok=[chk('ckn',g('ckn').length>=2,'Enter your full name'),chk('cke',/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em),'Enter a valid email address'),chk('ck2',MOB.test(m2)&&m2!=m1,MOB.test(m2)?'Alternate number must be different':'Enter a valid 10-digit number'),chk('cka',g('cka').length>=3,'Enter house / flat details'),chk('ckb',g('ckb').length>=3,'Enter street / area'),chk('ckc',g('ckc').length>=2,'Enter your city'),chk('cks',!!$('#cks').value,'Select your state'),chk('ckp',/^[1-9]\d{5}$/.test(g('ckp')),'Enter a valid 6-digit PIN code')];
if(ok.indexOf(false)>-1){var f=$('.f.bad input,.f.bad select');f&&f.focus();return}
if(!cart.length)return toast('Your cart is empty.');
var a={name:g('ckn'),email:em,m1:m1,m2:m2,a1:g('cka'),a2:g('ckb'),l:g('ckl'),c:g('ckc'),s:$('#cks').value,p:g('ckp')};
if(!sb||!RUID)return toast('Please verify your mobile number again.');
var btn=$('[data-act="place"]'),lbl=btn.textContent;var pay=curPay();if(!pay)return toast('These items cannot be bought together. Please order them separately.');
var send=function(ref){btn.disabled=true;btn.textContent='Placing order…';
sb.from('profiles').upsert({user_id:RUID,name:a.name,mobile:m1,mobile2:m2,email:em,address:{a1:a.a1,a2:a.a2,l:a.l,c:a.c,s:a.s,p:a.p}}).then(function(r){if(r.error)throw r.error;return sb.from('orders').insert({address:a,payment:pay,pay_ref:ref||null,items:cart.map(function(c){return{id:c.id,q:c.q,s:c.s||'',c:c.c||''}})}).select('*').single()}).then(function(r){if(r.error)throw r.error;CO.o=mapO(r.data);cart=[];save();CO.s=3;rco();$('#co').scrollTop=0;loadAcct()}).catch(function(err){btn.disabled=false;btn.textContent=lbl;var em0=(err&&err.message)||'';toast(/Invalid item/.test(em0)?'Some items are unavailable. Please review your cart.':/^(Only \d+ left|Please choose|Cash on Delivery is not|Online payment is not)/.test(em0)?em0:'Could not place the order. Please try again.'+(ref?' Keep your payment reference: '+ref:''))})};
if(pay==='UPI / Card')payOnline(TOT(),a,send,function(){btn.disabled=false});else send('')}
var SL=['Order Placed','Packed','Shipped','Out for Delivery','Delivered'],TH=[0,24,72,168,216];
var PL={sent:false,m:'',otp:''};
/* guest ordering: the phone number is enough; the browser gets a private guest account that remembers the number */
function guestLogin(m){return sb.auth.getSession().then(function(x){var s=x&&x.data&&x.data.session;if(s&&s.user&&s.user.is_anonymous)return s;return sb.auth.signInAnonymously().then(function(r){if(r.error)throw new Error(/anonymous/i.test(r.error.message||'')?'Ordering is not switched on yet. In Supabase turn on Authentication > Providers > Anonymous sign-ins.':(r.error.message||'Could not start. Please try again.'));return r.data.session})}).then(function(){return sb.auth.updateUser({data:{mobile:m}})}).then(function(r){if(r.error)throw new Error(r.error.message||'Could not save the number.');return sb.auth.getSession()}).then(function(x){return x.data.session})}
/* protect a guest account: give the number a password (the guest account becomes a normal account, orders stay) */
function pwBox(){if(!RGUEST)return'';return'<div class="pwbox" id="pwbox"><b>Protect your account</b><p>You are using +91 '+esc(RM)+' without a password. Set a password so only you can see your orders, and you can log in from any phone or computer with this number.</p><label class="f">Create password<input id="spw" type="password" autocomplete="new-password" placeholder="At least 6 characters"></label><label class="f">Confirm password<input id="spw2" type="password" autocomplete="new-password" placeholder="Type the password again"></label><button class="btn btn-d" data-pl="pset">Set password</button><div class="fe" id="spe" style="margin-top:10px"></div></div>'}
var PWK='wk_pwask';
function pwAskSet(){try{localStorage.setItem(PWK,String(Date.now()+60000))}catch(e){}}
function pwAskClear(){try{localStorage.removeItem(PWK)}catch(e){}}
function pwAskCheck(){var at=0;try{at=+localStorage.getItem(PWK)||0}catch(e){}if(!at||Date.now()<at||!RGUEST||!RM||$('.pwpop'))return;var d=document.createElement('div');d.className='pwpop';d.innerHTML='<div class="pwcard" role="dialog" aria-modal="true"><h3>Protect your account</h3><p>You placed an order with +91 '+esc(RM)+' but have not set a password. Set one now so only you can see your orders, and you can log in from any phone or computer.</p><button class="btn btn-d" data-pwp="set">Set password</button><button class="lnk" data-pwp="later">Later</button></div>';document.body.appendChild(d)}
setInterval(pwAskCheck,4000);
/* mobile + password accounts */
function custExists(m){return sb.rpc('customer_exists',{p_mobile:m}).then(function(r){if(r.error)throw new Error('Could not check this number. Please try again.');return r.data===true})}
function custAuth(m,pw,create){var em=m+'@'+MDOM;
if(create)return sb.auth.signUp({email:em,password:pw,options:{data:{mobile:m}}}).then(function(r){if(r.error){throw new Error(/registered|exists/i.test(r.error.message||'')?'This number already has an account. Please go back and enter its password.':/invalid/i.test(r.error.message||'')&&/email/i.test(r.error.message||'')?'The login id was rejected. Set CUSTOMER_EMAIL_DOMAIN in config.js to a real domain.':(r.error.message||'Could not create the account.'))}if(!r.data.session)throw new Error('The account was created but login is off: in Supabase turn off Authentication > Providers > Email > "Confirm email".');var s=r.data.session;s.fresh=true;return s});
return sb.auth.signInWithPassword({email:em,password:pw}).then(function(r){if(r.error)throw new Error(/invalid|credentials/i.test(r.error.message||'')?'Wrong password. Please try again.':(r.error.message||'Could not log in.'));return r.data.session})}

/* Peedya virtual card: tier and points grow with the number of orders */
var TIERS=[['New',0],['Normal',10],['Classic',50],['Silver',100],['Gold',500],['Premium',1000]];
function tierOf(n){var t=0;TIERS.forEach(function(x,i){if(n>=x[1])t=i});return t}
function fmtCard(n){return String(n).replace(/(\d{4})(?=\d)/g,'$1 ')}
function cardHtml(P2,O){if(!RCARD)return'';var n=O.filter(function(o){return o.ac!==-1}).length,ti=tierOf(n),T=TIERS[ti],nx=TIERS[ti+1],pts=n*10,num=String(RCARD.card_number||''),code=String(RCARD.security_code||'');
var shown=CSHOW?fmtCard(num):'\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 '+num.slice(-4);
var pct=nx?Math.min(100,Math.round((n-T[1])/(nx[1]-T[1])*100)):100;
return'<div class="vcw"><div class="vc t'+ti+'"><div class="vct"><b>Peedya</b><span class="vtier">'+T[0]+'</span></div><div class="vchip"></div><div class="vcn">'+shown+'</div><div class="vcb"><div><small>CARD HOLDER</small><b>'+esc(P2.name).toUpperCase()+'</b><span>+91 '+esc(RM)+'</span></div><div class="vcv"><small>SECURITY CODE</small><b>'+(CSHOW?esc(code):'\u2022\u2022\u2022')+'</b></div></div></div>'
+'<div class="vcm"><button type="button" class="lnk" data-pl="cshow">'+(CSHOW?'Hide card details':'Show card details')+'</button><button type="button" class="lnk" data-pl="cnew">Change security code</button></div>'
+'<div class="vcp"><div class="vcs"><div><b>'+pts+'</b><small>Points</small></div><div><b>'+n+'</b><small>Order'+(n==1?'':'s')+'</small></div><div><b>'+T[0]+'</b><small>Card level</small></div></div>'
+'<div class="vcbar"><i style="width:'+pct+'%"></i></div><p>'+(n==0?'No orders yet. Place your first order to start earning points.':nx?(nx[1]-n)+' more order'+(nx[1]-n==1?'':'s')+' to reach '+nx[0]+' (at '+nx[1]+' orders).':'You have reached the top level. Thank you for shopping with Peedya!')+'</p><p class="vcl">Levels: Normal 10 \u00b7 Classic 50 \u00b7 Silver 100 \u00b7 Gold 500 \u00b7 Premium 1000 orders. You earn 10 points for every order.</p></div></div>'}
function rpp(){var m=sess(),h;
if(!m&&PL.card){h='<div class="cw one"><div class="cbx"><h2>Log in with your card</h2><p class="sm">Enter the 16-digit number and the 3-digit security code of your Peedya card.</p><label class="f">Card number<input id="plcn" inputmode="numeric" autocomplete="off" data-num="16" placeholder="16-digit card number"></label><label class="f">Security code<input id="plcc" type="password" inputmode="numeric" autocomplete="off" data-num="3" placeholder="3 digits"></label><button class="btn btn-d" data-pl="clogin">Log in</button><button class="lnk" data-pl="cmode">Use mobile number and password instead</button><div class="fe" id="ple" style="margin-top:12px;text-align:center"></div></div></div>'}
else if(!m){var pw=PL.ph==='pw',nw=pw&&!PL.ex;h='<div class="cw one"><div class="cbx"><h2>'+(!pw?'Log in':nw?'Create a password':'Enter your password')+'</h2><p class="sm">'+(!pw?'Enter your mobile number to access your profile, orders and tracking.':nw?'This number is new. Choose a password for +91 '+esc(PL.m)+' to create your account.':'Enter the password for +91 '+esc(PL.m)+'.')+'</p>'+(!pw?'<label class="f">Mobile number<div class="fld"><span>+91</span><input id="plm" type="tel" inputmode="numeric" data-num="10" value="'+esc(PL.m)+'" placeholder="Enter 10-digit number"></div></label><button class="btn btn-d" data-pl="send">Continue</button><button class="lnk" data-pl="cmode">Log in with card number instead</button>':'<label class="f">'+(nw?'Create password':'Password')+'<input id="plw" type="password" autocomplete="'+(nw?'new-password':'current-password')+'" placeholder="'+(nw?'At least 6 characters':'Your password')+'"></label>'+(nw?'<label class="f">Confirm password<input id="plw2" type="password" autocomplete="new-password" placeholder="Type the password again"></label>':'')+'<button class="btn btn-d" data-pl="pwgo">'+(nw?'Create account':'Log in')+'</button><button class="lnk" data-pl="chg">Change number</button>')+'<div class="fe" id="ple" style="margin-top:12px;text-align:center"></div><p class="sm" style="margin:18px 0 0;text-align:center">New here? Enter your number and choose a password to create your account.</p></div></div>'}
else if(!RLOAD){h='<div class="cw one"><div class="cbx" style="text-align:center">Loading your account…</div></div>'}
else{var P2=profOf(m)||{name:'WebKit Customer',m:m,m2:'',email:'',a:null,since:Date.now()},O=RORD,a=P2.a;
h='<div class="cw one" style="max-width:860px"><div class="cbx" style="margin-bottom:24px"><div class="ph"><div class="pav">'+esc(P2.name[0]).toUpperCase()+'</div><div style="flex:1"><b>'+esc(P2.name)+'</b><span>+91 '+esc(P2.m)+(P2.email?' · '+esc(P2.email):'')+'</span><span>Member since '+new Date(P2.since).toLocaleDateString('en-IN',{month:'short',year:'numeric'})+' · '+O.length+' order'+(O.length==1?'':'s')+'</span></div><button class="btn btn-l" data-pl="out" style="min-height:40px;padding:8px 18px">Log out</button></div>'+(a?'<div class="ob" style="margin-top:20px"><div><b>Saved address</b>'+esc(a.a1)+', '+esc(a.a2)+(a.l?', '+esc(a.l):'')+'<br>'+esc(a.c)+', '+esc(a.s)+' – '+esc(a.p)+'</div><div><b>Alternate mobile</b>+91 '+esc(P2.m2)+'</div></div>':'')+'</div>'+pwBox()+cardHtml(P2,O)+'<h2 style="font-size:24px;margin-bottom:16px">My Orders</h2>'+
(O.length?O.map(function(o){var bt=o.at||o.t,pd=o.ac===0,rj=o.ac===-1,hrs=(Date.now()-bt)/36e5,ix=0;TH.forEach(function(x,i){if(hrs>=x)ix=i});if(o.st!=null)ix=+o.st;var q=o.a;
return'<div class="oc"><div class="oh"><div><b>Order #'+o.id+'</b><small>Placed on '+fd(o.t)+' · Tracking ID '+o.trk+'</small></div><span class="bd'+(ix==4&&!pd&&!rj?' d':'')+'">'+(pd?'Awaiting confirmation':rj?'Cancelled':SL[ix])+'</span></div><div class="oi">'+o.items.map(function(it){return'<div><img src="'+U(it.i,120)+'" alt=""><span>'+esc(it.n)+' × '+it.q+(it.s||it.c?' <small>('+esc([it.s?'Size '+it.s:'',it.c||''].filter(Boolean).join(', '))+')</small>':'')+'</span></div>'}).join('')+'</div>'+(pd||rj?'<div class="demo" style="margin:18px 0">'+(pd?'We have received your order. Tracking starts once the store confirms it.':'This order was cancelled by the store.')+'</div>':'<div class="tl">'+SL.map(function(l,i){return'<div class="'+(i<=ix?'dn':'')+'"><b>'+l+'</b>'+(i<=ix?fd(bt+TH[i]*36e5):'Expected '+fd(bt+TH[i]*36e5))+'</div>'}).join('')+'</div>')+'<div class="ob"><div><b>Shipping to</b>'+esc(q.name)+'<br>'+esc(q.a1)+', '+esc(q.a2)+(q.l?', '+esc(q.l):'')+'<br>'+esc(q.c)+', '+esc(q.s)+' – '+esc(q.p)+'<br>+91 '+esc(q.m1)+' / +91 '+esc(q.m2)+'</div><div><b>Payment &amp; delivery</b>'+o.pay+' · pay '+fmt(o.tot)+' on delivery<br>Items '+fmt(o.sub)+' · Delivery '+(o.sh?fmt(o.sh):'Free')+(o.cf?' · COD charge '+fmt(o.cf):'')+'<br>Carrier: WebKit Express<br>Estimated delivery: '+fd(bt+7*864e5)+' – '+fd(bt+9*864e5)+'</div></div></div>'}).join(''):'<div class="cbx" style="text-align:center">No orders found for this number yet.</div>')+'</div>'}
$('#ppf').innerHTML=h}
$('#pp').addEventListener('click',function(e){var b=e.target.closest('[data-pl]');if(!b)return;var a=b.dataset.pl,er=$('#ple');
if(a=='send'){var m=$('#plm').value;if(!MOB.test(m)){er.textContent='Please enter a valid 10-digit Indian mobile number.';return}if(!sb){er.textContent='Login is not available right now. Please try again later.';return}
b.disabled=true;er.textContent='';custExists(m).then(function(ex){b.disabled=false;PL.m=m;PL.ex=ex;PL.ph='pw';rpp();var f=$('#plw');f&&f.focus()}).catch(function(x){b.disabled=false;er.textContent=x.message||'Something went wrong. Please try again.'})}
else if(a=='chg'){PL.ph='m';rpp()}
else if(a=='pwgo'){var pw=$('#plw').value,pw2=$('#plw2');if(pw.length<6){er.textContent='The password must be at least 6 characters.';return}if(pw2&&pw2.value!==pw){er.textContent='The two passwords do not match.';return}b.disabled=true;er.textContent='';custAuth(PL.m,pw,!PL.ex).then(function(s){b.disabled=false;PL={sent:false,m:'',otp:''};authSet(s);toast(s&&s.fresh?'Account created':'Logged in')}).catch(function(x){b.disabled=false;er.textContent=x.message})}
else if(a=='cmode'){PL.card=!PL.card;rpp()}
else if(a=='pset'){var sp=$('#spw').value,sp2=$('#spw2').value,se=$('#spe');if(sp.length<6){se.textContent='The password must be at least 6 characters.';return}if(sp!==sp2){se.textContent='The two passwords do not match.';return}b.disabled=true;se.textContent='';
sb.auth.updateUser({email:RM+'@'+MDOM,password:sp}).then(function(r){if(r.error)throw new Error(/registered|already|exists/i.test(r.error.message||'')?'This number already has a password on another account. Log out, then log in with that password.':(r.error.message||'Could not set the password.'));return sb.auth.refreshSession()}).then(function(x){b.disabled=false;var s=x&&x.data&&x.data.session;if(!s||(s.user&&s.user.is_anonymous)){se.textContent='Almost done, but the account is not ready: in Supabase turn off Authentication > Providers > Email > "Confirm email".';return}pwAskClear();authSet(s);toast('Password set. Your account is protected.')}).catch(function(x){b.disabled=false;se.textContent=x.message})}
else if(a=='clogin'){var cn=$('#plcn').value.replace(/\D/g,''),cc=$('#plcc').value;if(cn.length!=16||cc.length!=3){er.textContent='Enter the 16-digit card number and the 3-digit security code.';return}if(!sb){er.textContent='Login is not available right now.';return}b.disabled=true;er.textContent='';
apiCall('/card-login',{card:cn,code:cc}).then(function(r){if(!r||!r.token_hash)throw new Error('Could not log in with the card. Please try again.');return sb.auth.verifyOtp({token_hash:r.token_hash,type:'magiclink'})}).then(function(v){b.disabled=false;if(v.error)throw new Error('Could not log in. Please try again.');PL={sent:false,m:'',otp:''};toast('Logged in')}).catch(function(x){b.disabled=false;er.textContent=x.message})}
else if(a=='cshow'){CSHOW=!CSHOW;rpp()}
else if(a=='cnew'){if(!confirm('Make a new 3-digit security code? The old one will stop working.'))return;sb.rpc('reset_my_card_code').then(function(r){if(r.error){toast(r.error.message,1);return}if(RCARD)RCARD.security_code=r.data;CSHOW=true;rpp();toast('New security code created')})}
else if(a=='out'){sb&&sb.auth.signOut().then(function(){PL={sent:false,m:'',otp:''};RCARD=null;CSHOW=false;rpp();toast('Logged out')})}});
/* scroll animations (repeatable, direction aware) */
var io=new IntersectionObserver(function(es){es.forEach(function(e){var t=e.target;
if(e.isIntersecting){t.classList.remove('above');t.classList.add('in')}
else{t.classList.remove('in');t.classList.toggle('above',e.boundingClientRect.top<0)}})},{threshold:.12,rootMargin:'0px 0px -6% 0px'});
function obs(){$$('.rv:not([data-o])').forEach(function(e){e.dataset.o=1;io.observe(e)});}
/* recently viewed / suggested */
var DEM={},RVK='pd_recent';
function recGet(){try{var a=JSON.parse(localStorage.getItem(RVK)||'[]');return Array.isArray(a)?a.filter(function(x){return typeof x=='number'}):[]}catch(e){return[]}}
function recView(id){try{var a=recGet().filter(function(x){return x!=id});a.unshift(id);localStorage.setItem(RVK,JSON.stringify(a.slice(0,12)))}catch(e){}}
function bought(p){return DEM[p.id]||0}
function demand(p){return bought(p)*5+(p.rc||0)+(p.best?3:0)+(p.feat?1:0)}
function topBy(fn,list,n){return list.slice().sort(function(a,b){return fn(b)-fn(a)||a.id-b.id}).slice(0,n)}
function paintSug(){var N=10,rv=$('#rvg'),sg=$('#sgg');if(!rv||!sg)return;var rec=recGet().map(byId).filter(Boolean),a=rec.length?rec.slice(0,N):topBy(function(p){return bought(p)||(p.rc||0)/1000},P,N),used={};a.forEach(function(p){used[p.id]=1});var rest=P.filter(function(p){return !used[p.id]&&p.s!==false}),b=topBy(demand,rest.length>=4?rest:P,N);
rv.innerHTML=a.map(function(p){return card(p,{desc:1})}).join('');$('#recent').hidden=!a.length;sg.innerHTML=b.map(function(p){return card(p,{desc:1})}).join('');$('#suggest').hidden=!b.length}
function loadDem(){if(!sb||!sb.rpc)return;try{sb.rpc('product_demand').then(function(r){if(r&&!r.error&&r.data){DEM={};r.data.forEach(function(x){DEM[x.product_id]=+x.units});paintSug();obs()}}).catch(function(){})}catch(e){}}
function paint(){buildTabs();buildPromo();buildSlider();var fl=P.filter(function(p){return p.feat}).sort(byPos('pf')),bl=P.filter(function(p){return p.best}).sort(byPos('pb')),hc=CATS.filter(function(c){return c.h>0&&P.some(function(p){return p.c==c.n})}).sort(function(a,b){return a.h-b.h});
$('#fg').innerHTML=fl.map(function(p){return card(p,{desc:1})}).join('');$('#featured').hidden=!fl.length;
$('#bgd').innerHTML=bl.map(function(p){return card(p,{tag:1,desc:1,rc:1})}).join('');$('#best').hidden=!bl.length;
var ch=hc.map(function(c,i){return'<div class="cc" data-cat="'+esc0(c.n)+'" title="'+esc0(c.n)+'" aria-label="'+esc0(c.n)+'"><img loading="lazy" src="'+U(c.img,600)+'" alt="'+esc0(c.n)+'"><em class=\"cn\">'+esc0(c.n)+'</em></div>'}),hf=Math.ceil(ch.length/2);$('#cats').innerHTML='<div class="crow">'+ch.slice(0,hf).join('')+'</div>'+(ch.length>hf?'<div class="crow">'+ch.slice(hf).join('')+'</div>':'');$('#cats').hidden=!hc.length;$('#cats').style.setProperty('--cols',Math.max(1,Math.min(6,Math.ceil(hc.length/2))));
paintSug();render();drawCart();obs()}
paint();loadDem();

if(sb){sb.auth.onAuthStateChange(function(ev,ss){if(ev=='TOKEN_REFRESHED')return;setTimeout(function(){authSet(ss)},0)});
sb.channel('wk-live').on('postgres_changes',{event:'*',schema:'public',table:'products'},function(){deb(sbLoad)}).on('postgres_changes',{event:'*',schema:'public',table:'categories'},function(){deb(sbLoad)}).on('postgres_changes',{event:'*',schema:'public',table:'explore_tabs'},function(){deb(sbLoad)}).on('postgres_changes',{event:'*',schema:'public',table:'hero_slides'},function(){deb(sbLoad)}).on('postgres_changes',{event:'*',schema:'public',table:'promo_banners'},function(){deb(sbLoad)}).on('postgres_changes',{event:'*',schema:'public',table:'site_settings'},function(){deb(sbLoad)}).on('postgres_changes',{event:'*',schema:'public',table:'orders'},function(){deb(loadAcct)}).on('postgres_changes',{event:'*',schema:'public',table:'messages'},function(){deb(loadMsgs)}).subscribe();sbLoad()}
addEventListener('load',mp);addEventListener('resize',mp);mp();route();
/* keep the profile page open after a refresh */
if(location.hash=='#profile'){PL={sent:false,m:'',otp:''};rpp();open($('#pp'))}
})();