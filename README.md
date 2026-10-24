# Peedya store

A static storefront and admin panel powered by [Supabase](https://supabase.com).
No build step, no framework: upload the folder to any static host.

```
peedya-project/
├── index.html              Storefront page (markup only)
├── sitemap.xml, llms.txt   SEO / AI-search files
├── robots.txt              Search engine rules (sitemap, AI crawlers)
├── assets/
│   ├── css/styles.css      Storefront styles
│   └── js/
│       ├── config.js       ← YOUR Supabase URL + anon key go here
│       ├── content.js      Editable reviews and FAQ text
│       └── app.js          Storefront logic (catalogue, cart, checkout, profile)
├── adilwebkit/
│   ├── index.html          Admin panel (open /adilwebkit/)
│   ├── admin.css
│   └── admin.js            Products, categories, orders, customers
└── supabase/
    └── schema.sql          Database tables, security rules, image storage (no demo data)
```

The store starts **empty**. Only products you add in the admin appear on the site.

## Setup (once)

1. **Create a Supabase project** at supabase.com.
2. **Database:** Supabase → *SQL Editor* → paste all of `supabase/schema.sql` → *Run*.
3. **Admin user:** *Authentication → Users → Add user*. Use the email from `ADMIN_EMAIL`
   in `assets/js/config.js` (default `admin@webkit.store`), choose a strong password and tick
   *Auto Confirm User*. Then run the last statement of `schema.sql` again (it makes that user an admin).
   You log in at `/adilwebkit/` with username `admin` and that password.
4. **Customer ordering and login (no SMS):** *Authentication → Providers → Anonymous sign-ins* → **on**, and
   *Authentication → Providers → Email → Confirm email* → **off** (details in "Customer ordering and password" below).
5. **Disable public email sign-ups:** *Authentication → Providers → Email → turn off "Allow new users to sign up"*
   (the admin user already exists).
6. **Keys:** *Project Settings → API*. Put the *Project URL* and *anon public* key into
   `assets/js/config.js`. Never put the `service_role` key in any file here.
7. **Deploy:** upload the folder to Netlify, Vercel, Cloudflare Pages or GitHub Pages
   (drag and drop works). Open `/adilwebkit/`, add categories and products. They appear on the store instantly.

## Day to day

| Task | Where |
| --- | --- |
| Add / edit / hide / delete products (up to 3 photos each), mark Featured or Best seller | Admin → Products |
| Add categories, choose which show as home page cards | Admin → Categories |
| Accept or reject new orders, update tracking | Admin → Dashboard / Orders |
| Up to 10 promo photos under the hero buttons, each opening a page you choose | Admin → Promo Banners |
| Slider under Featured Picks: up to 10 photos, each with its own text and a link to any page | Admin → Slider |
| Rename, add or delete the Explore Our Products tabs (Boys / Girls / Adults …) | Admin → Explore Tabs |
| Choose which products appear in Explore Our Products (tick "Show in Explore Our Products", or tap the Explore chip in the list) | Admin → Products |
| Change the order of Featured Picks, Shop by Category, Explore Our Products, Best Sellers and the Shop Now page (type position numbers) | Admin → Positions |
| Message a customer (they see it under the message icon in the header) | Admin → Messages |
| See subscribed mobile numbers, download as CSV | Admin → Subscribers |
| Edit reviews and FAQ text | `assets/js/content.js` |
| Footer contact details, About text | `index.html` |

## How it works

- Visitors read products and categories (only visible ones) directly from Supabase. Admin changes reach open pages live.
- Customers order with just their mobile number (no OTP, no password). They can set a password for the number later to protect it and use it on any device.
- Order totals are calculated by the database from your current prices, not by the browser.
  New orders wait as *pending* until you accept them; tracking starts on acceptance.
- Row Level Security lets only the admin change products, categories and order status.
- The browser keeps only the cart and a cached copy of the last product list.

## Before going live

- Replace the placeholder reviews in `content.js` with real ones, or empty the list.
- Update the statistics shown on the page (hero badge, About numbers, product page trust strip),
  the footer contact details, and your return / delivery policy wording so they match reality.
- Add real Privacy Policy, Terms and Returns pages and link them in the footer.


## Sellers

1. **Re-run `supabase/schema.sql`** in Supabase > SQL Editor (safe to re-run).
2. Sellers use their own page at **`/seller/`** (separate from the store, like the admin page). It is not linked from the store.
3. A seller opens `/seller/` > **Create a seller account**, fills in the business details and picks an email + password. The application goes to **Admin > Sellers > Seller applications**.
4. Admin taps **Accept seller** (or **Reject** with a reason). After acceptance the seller logs in with email + password and gets the seller dashboard (Dashboard, Add Product, My Products, Orders, Payments, Settings).
5. Sellers add products (category from the admin's list, size type letters/numbers, colours, stock, description). Each product appears under **Admin > Sellers > Products waiting for approval**. **Approve & list in store** puts it live; **Reject** sends it back with a reason. Sellers cannot set ratings, featured/best seller or audience, or create categories.
6. Products with sizes or colours make customers pick them on the product page; the choice is saved on the order and shown to the seller. Stock goes down automatically on each order.

**Supabase setting:** Authentication > Providers > Email must be enabled. For instant sign-up turn **off** "Confirm email". If you keep it on, sellers get a confirmation email first and their application is sent when they log in after confirming.

## Payment options (new)
- Each product has **Cash on Delivery** and **UPI / Card** switches (the seller sets them when adding a product; admin products are Cash on Delivery only).
- Both on: the buyer picks either at checkout. Only UPI / Card on: checkout shows Cash on Delivery as *not available*, and the product page says so.
- If the cart mixes a COD-only item with an online-only item, checkout asks the buyer to order them separately.
- **UPI / Card uses Razorpay Standard Checkout with server-side verification** (see the Razorpay section below). The payment ID is saved on the order (`pay_ref`) and shown in **Admin > Orders**.


## Razorpay (UPI / Card) setup
The website is static, so the Razorpay secret and the card-login check run on a **Cloudflare Worker** (`worker/`), not on Supabase:
- `POST /create-order` works out the amount from the real product prices and creates the Razorpay order.
- `POST /verify-payment` checks the signature (HMAC-SHA256 of `order_id|payment_id` with the key secret). Only a matching payment is saved, and the `orders` table accepts it once, for the same customer and the same amount.
- `POST /card-login` is for logging in with the virtual card number (see below).

Steps (one time): follow `worker/README.md` (install, add the secrets, `npx wrangler deploy`), then put the Worker address in `API_BASE` in `assets/js/config.js`. Also re-run `supabase/schema.sql` in the SQL Editor (adds the `payments` table and the order check).
Test: add a product with the **UPI / Card** switch on, put it in the cart, choose **Pay now (UPI / Card)**. Test card: `4111 1111 1111 1111`, any future date, any CVV; or the test UPI ID `success@razorpay`. Going live: create live keys in the Razorpay dashboard and set the two Razorpay secrets again.

## Security notes
- **Real protection is in the database.** `/adilwebkit/` and `/seller/` are public web pages that only show a login form. Everything private (orders, customers, payouts) is guarded by Row Level Security in `supabase/schema.sql`, so opening a URL or editing the page in the browser shows no data without a valid admin / seller login.
- Re-run `supabase/schema.sql` after every update (section 15 adds upload limits, size limits and an order rate limit).
- Every page has a Content-Security-Policy (no inline scripts allowed). If you use a custom Supabase domain, add it to `connect-src` in the `<meta http-equiv="Content-Security-Policy">` tag of each HTML file.
- `_headers`, `_redirects` and `vercel.json` add security headers and hide `/supabase/`, `/worker/` and `README.md` on Netlify, Cloudflare Pages and Vercel. **Upload only the website files** (index.html, assets, adilwebkit, seller, privacy/terms, manifest) to your host; keep the `supabase/` and `worker/` folders on your computer.
- In the Supabase dashboard: set sensible **rate limits** for Auth, use a long admin password and enable **MFA**, and keep "Confirm email" settings as you need.

## Customer ordering and password (no SMS, no OTP)
- **Ordering:** a customer types a mobile number and goes straight to the address step. No OTP and no password. The browser gets a private *guest account* that remembers the number, so the customer sees their orders on that phone or computer.
- **Protect the account:** on the profile page a guest sees a "Protect your account" box. Setting a password turns the guest account into a normal account for that number (orders stay). After that the same number + password opens the account on any phone or computer. If a customer orders and has not set a password after **1 minute**, a pop-up asks them to (they can choose "Later"; it asks again after the next order).
- A number that already has a password asks for it at checkout; the customer can enter it or choose "Order as a guest instead" (then the order is not added to the protected account).
- Every account only sees its own rows (database rules in `supabase/schema.sql`).

Set up once in Supabase:
1. **Authentication > Providers > Anonymous sign-ins**: switch **on**.
2. **Authentication > Providers > Email**: keep it on and switch **Confirm email** **off** (the login id is `number@peedya.in`, no email is ever sent). If Supabase rejects that domain, set `CUSTOMER_EMAIL_DOMAIN` in `assets/js/config.js` to a domain that can receive mail.
3. **Authentication > Providers > Phone** and **CAPTCHA**: leave them off.
4. Run `supabase/schema.sql` again (sections 26 and 27).

Good to know: nothing proves a number belongs to the person who uses it, and there is no "forgot password" (no SMS or email). The first person to set a password for a number owns that account, and a guest account is lost if the browser data is cleared before a password is set.

## Peedya virtual card
Every customer who logs in with a mobile number gets a virtual card on the profile page: name, mobile number, a unique 16-digit card number and a 3-digit security code (hidden until "Show card details"). The level grows with the number of orders (cancelled orders do not count): New (0-9), Normal (10), Classic (50), Silver (100), Gold (500), Premium (1000 and above). Points: 10 per order.
- The card is created by the database (`get_my_card()` in `supabase/schema.sql`, section 22) and belongs to the customer's login, so it is the same on every device.
- **Log in with card:** on the profile login screen, "Log in with card number instead". It uses the Worker's `/card-login` route. After 5 wrong security codes the card is locked for 1 hour, then 2, 4 ... up to 24 hours (a 3-digit code is easy to guess, so the lock matters). OTP login always still works.
- A customer can make a new security code with "Change security code".
