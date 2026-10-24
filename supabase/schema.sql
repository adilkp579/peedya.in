-- =====================================================================
-- WebKit store: database schema (no demo data)
-- Run this whole file once in Supabase > SQL Editor > New query > Run.
-- It is safe to run again.
-- =====================================================================

-- 1) Admin list (only people in this table get admin powers)
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select to authenticated using (user_id = auth.uid());

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- 2) Tables
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text unique not null,
  image text,
  home_order int not null default 0,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.products (
  id bigint generated always as identity primary key,
  name text not null,
  category text not null,
  audience text not null default 'Adults',
  price numeric not null check (price > 0),
  old_price numeric not null default 0,
  rating numeric not null default 4.5,
  reviews int not null default 0,
  image text not null,
  description text not null default '',
  featured boolean not null default false,
  best_seller boolean not null default false,
  in_stock boolean not null default true,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text, mobile text, mobile2 text, email text, address jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.orders (
  id text primary key,
  user_id uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  stage int,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  tracking_id text,
  payment text not null default 'Cash on Delivery',
  subtotal numeric, shipping numeric, total numeric,
  address jsonb not null,
  items jsonb not null
);

-- 3) Order safety: prices, totals and status are set by the database, not the browser
create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare it jsonb; pr public.products; q int; sub numeric := 0; norm jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then raise exception 'Invalid item'; end if;
  for it in select value from jsonb_array_elements(new.items) loop
    q := coalesce((it->>'q')::int, 0);
    select * into pr from public.products where id = (it->>'id')::bigint and visible and in_stock;
    if not found or q < 1 or q > 20 then raise exception 'Invalid item'; end if;
    sub := sub + pr.price * q;
    norm := norm || jsonb_build_array(jsonb_build_object('id', pr.id, 'n', pr.name, 'i', pr.image, 'q', q, 'p', pr.price));
  end loop;
  new.id := 'WK' || lpad((floor(random() * 1e8))::bigint::text, 8, '0');
  new.user_id := auth.uid();
  new.items := norm;
  new.subtotal := sub;
  new.shipping := case when sub >= 999 then 0 else 49 end;
  new.total := sub + new.shipping;
  new.status := 'pending'; new.stage := null; new.accepted_at := null;
  new.payment := 'Cash on Delivery';
  new.tracking_id := 'WKT' || lpad((floor(random() * 1e10))::bigint::text, 10, '0');
  return new;
end $$;
drop trigger if exists orders_before_insert on public.orders;
create trigger orders_before_insert before insert on public.orders for each row execute function public.orders_before_insert();

-- 4) Row level security
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.profiles   enable row level security;
alter table public.orders     enable row level security;

drop policy if exists "categories public read" on public.categories;
drop policy if exists "categories admin write" on public.categories;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products public read" on public.products;
drop policy if exists "products admin write" on public.products;
create policy "products public read" on public.products for select to anon, authenticated using (visible);
create policy "products admin write" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles own insert" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles own read" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "profiles own insert" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles own update" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles admin read" on public.profiles for select to authenticated using (public.is_admin());

drop policy if exists "orders read" on public.orders;
drop policy if exists "orders insert own" on public.orders;
drop policy if exists "orders admin update" on public.orders;
create policy "orders read" on public.orders for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "orders insert own" on public.orders for insert to authenticated with check (user_id = auth.uid());
create policy "orders admin update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- 5) Image storage (product photos uploaded from the admin page)
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;
drop policy if exists "product images public read" on storage.objects;
drop policy if exists "product images admin insert" on storage.objects;
drop policy if exists "product images admin update" on storage.objects;
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images public read" on storage.objects for select using (bucket_id = 'product-images');
create policy "product images admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin update" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "product images admin delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- 6) Live updates (store and admin refresh by themselves)
do $$ begin
  begin alter publication supabase_realtime add table public.products;   exception when others then null; end;
  begin alter publication supabase_realtime add table public.categories; exception when others then null; end;
  begin alter publication supabase_realtime add table public.orders;     exception when others then null; end;
  begin alter publication supabase_realtime add table public.profiles;   exception when others then null; end;
end $$;

-- 7) Product photos (up to 3), customer messages and mobile subscribers
alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;
-- display positions (edited in Admin > Positions); every list keeps its own order
alter table public.products add column if not exists in_explore boolean not null default true;  -- tick per product in Admin to show it in Explore Our Products
alter table public.products
  add column if not exists pos_explore  int not null default 0,
  add column if not exists pos_shop     int not null default 0,
  add column if not exists pos_featured int not null default 0,
  add column if not exists pos_best     int not null default 0;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='sort_order') then
    execute 'update public.products set pos_explore = sort_order, pos_shop = sort_order, pos_featured = sort_order, pos_best = sort_order where sort_order > 0';
    execute 'alter table public.products drop column sort_order';
  end if;
end $$;
update public.products set pos_explore  = id where pos_explore  = 0;
update public.products set pos_shop     = id where pos_shop     = 0;
update public.products set pos_featured = id where pos_featured = 0;
update public.products set pos_best     = id where pos_best     = 0;

-- a new product automatically goes to the end of every list
create or replace function public.products_set_positions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.pos_explore, 0)  = 0 then new.pos_explore  := coalesce((select max(pos_explore)  from public.products), 0) + 1; end if;
  if coalesce(new.pos_shop, 0)     = 0 then new.pos_shop     := coalesce((select max(pos_shop)     from public.products), 0) + 1; end if;
  if coalesce(new.pos_featured, 0) = 0 then new.pos_featured := coalesce((select max(pos_featured) from public.products), 0) + 1; end if;
  if coalesce(new.pos_best, 0)     = 0 then new.pos_best     := coalesce((select max(pos_best)     from public.products), 0) + 1; end if;
  return new;
end $$;
drop trigger if exists products_set_positions on public.products;
create trigger products_set_positions before insert on public.products for each row execute function public.products_set_positions();

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,   -- the customer this conversation belongs to
  sender text not null check (sender in ('admin','customer')),
  body text not null check (char_length(body) between 1 and 1000),
  customer_read boolean not null default false,
  admin_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_user_idx on public.messages (user_id, created_at);
alter table public.messages enable row level security;

create or replace function public.messages_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sender = 'admin' then
    if not public.is_admin() then raise exception 'Not allowed'; end if;
    new.customer_read := false; new.admin_read := true;
  else
    new.sender := 'customer'; new.user_id := auth.uid();
    new.customer_read := true; new.admin_read := false;
  end if;
  return new;
end $$;
drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert before insert on public.messages for each row execute function public.messages_before_insert();

drop policy if exists "messages read" on public.messages;
drop policy if exists "messages customer insert" on public.messages;
drop policy if exists "messages admin insert" on public.messages;
create policy "messages read" on public.messages for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- customers can write only after they have placed an order (or once the store has messaged them)
create policy "messages customer insert" on public.messages for insert to authenticated
  with check (user_id = auth.uid() and sender = 'customer' and (
    exists (select 1 from public.orders o where o.user_id = auth.uid())
    or exists (select 1 from public.messages m where m.user_id = auth.uid() and m.sender = 'admin')));
create policy "messages admin insert" on public.messages for insert to authenticated
  with check (public.is_admin() and sender = 'admin');

create or replace function public.mark_messages_read() returns void
language sql security definer set search_path = public as
$$ update public.messages set customer_read = true where user_id = auth.uid() and sender = 'admin' and not customer_read $$;
create or replace function public.mark_messages_read_admin(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  update public.messages set admin_read = true where user_id = p_user and sender = 'customer' and not admin_read;
end $$;
revoke execute on function public.mark_messages_read() from public, anon;
revoke execute on function public.mark_messages_read_admin(uuid) from public, anon;
grant execute on function public.mark_messages_read() to authenticated;
grant execute on function public.mark_messages_read_admin(uuid) to authenticated;

create table if not exists public.subscribers (
  id bigint generated always as identity primary key,
  mobile text unique not null check (mobile ~ '^[6-9][0-9]{9}$'),
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;
drop policy if exists "subscribers public insert" on public.subscribers;
drop policy if exists "subscribers admin read" on public.subscribers;
drop policy if exists "subscribers admin delete" on public.subscribers;
create policy "subscribers public insert" on public.subscribers for insert to anon, authenticated with check (true);
create policy "subscribers admin read" on public.subscribers for select to authenticated using (public.is_admin());
create policy "subscribers admin delete" on public.subscribers for delete to authenticated using (public.is_admin());

do $$ begin
  begin alter publication supabase_realtime add table public.messages;    exception when others then null; end;
  begin alter publication supabase_realtime add table public.subscribers; exception when others then null; end;
end $$;

-- 7b) Explore Our Products tabs (editable in Admin > Explore Tabs)
create table if not exists public.explore_tabs (
  id bigint generated always as identity primary key,
  name text unique not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.explore_tabs enable row level security;
drop policy if exists "tabs public read" on public.explore_tabs;
drop policy if exists "tabs admin write" on public.explore_tabs;
create policy "tabs public read" on public.explore_tabs for select to anon, authenticated using (true);
create policy "tabs admin write" on public.explore_tabs for all to authenticated using (public.is_admin()) with check (public.is_admin());
do $$ begin
  begin alter publication supabase_realtime add table public.explore_tabs; exception when others then null; end;
end $$;
-- starting tabs (rename, delete or add more in the admin)
insert into public.explore_tabs (name, sort)
select * from (values ('Boys', 1), ('Girls', 2), ('Adults', 3)) as v(name, sort)
where not exists (select 1 from public.explore_tabs);

-- 7c) Slider under Featured Picks (max 5 slides with links, edited in Admin > Slider)
create table if not exists public.hero_slides (
  id bigint generated always as identity primary key,
  image text not null,
  tag text not null default '',
  title text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.hero_slides enable row level security;
drop policy if exists "hero public read" on public.hero_slides;
drop policy if exists "hero admin write" on public.hero_slides;
create policy "hero public read" on public.hero_slides for select to anon, authenticated using (true);
create policy "hero admin write" on public.hero_slides for all to authenticated using (public.is_admin()) with check (public.is_admin());
alter table public.hero_slides
  add column if not exists link_type  text not null default 'none' check (link_type in ('none','shop','category','tab','product','url')),
  add column if not exists link_value text not null default '';
create or replace function public.hero_slides_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.hero_slides) >= 10 then raise exception 'Maximum 10 hero slides'; end if;
  return new;
end $$;
drop trigger if exists hero_slides_limit on public.hero_slides;
create trigger hero_slides_limit before insert on public.hero_slides for each row execute function public.hero_slides_limit();
do $$ begin
  begin alter publication supabase_realtime add table public.hero_slides; exception when others then null; end;
end $$;

-- 7d) Promo banners under the hero buttons (max 10, edited in Admin > Promo Banners)
create table if not exists public.promo_banners (
  id bigint generated always as identity primary key,
  image text not null,
  link_type text not null default 'shop' check (link_type in ('shop','category','tab','product','url')),
  link_value text not null default '',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.promo_banners enable row level security;
drop policy if exists "promo public read" on public.promo_banners;
drop policy if exists "promo admin write" on public.promo_banners;
create policy "promo public read" on public.promo_banners for select to anon, authenticated using (true);
create policy "promo admin write" on public.promo_banners for all to authenticated using (public.is_admin()) with check (public.is_admin());
create or replace function public.promo_banners_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.promo_banners) >= 10 then raise exception 'Maximum 10 promo banners'; end if;
  return new;
end $$;
drop trigger if exists promo_banners_limit on public.promo_banners;
create trigger promo_banners_limit before insert on public.promo_banners for each row execute function public.promo_banners_limit();
do $$ begin
  begin alter publication supabase_realtime add table public.promo_banners; exception when others then null; end;
end $$;

-- 8) Make your admin user an admin.
-- FIRST create the user: Supabase > Authentication > Users > Add user
--   email: admin@webkit.store   (any email works; keep it the same as ADMIN_EMAIL in admin.html)
--   password: the password you want to log in with   (tick "Auto Confirm User")
-- THEN run this statement (you can run it again after creating the user):
insert into public.admins (user_id)
select id from auth.users where email = 'admin@webkit.store'
on conflict do nothing;

-- =====================================================================
-- 9) SELLERS  (run this whole file again in Supabase > SQL Editor; it is safe to re-run)
--    Sellers add products from /seller/. Products stay hidden until the admin approves them.
-- =====================================================================
create table if not exists public.sellers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  owner_name text not null,
  mobile text,
  email text not null,
  business_type text not null default 'Individual',
  address jsonb not null default '{}'::jsonb,
  gstin text,
  upi text,
  bank jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','active','rejected','suspended')),
  review_note text,
  created_at timestamptz not null default now()
);
-- (for projects that already ran an older version of this file)
alter table public.sellers drop constraint if exists sellers_status_check;
alter table public.sellers add constraint sellers_status_check check (status in ('pending','active','rejected','suspended'));
alter table public.sellers alter column status set default 'pending';
alter table public.sellers add column if not exists review_note text;
alter table public.sellers enable row level security;

create or replace function public.is_seller() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sellers where user_id = auth.uid() and status = 'active')
$$;

drop policy if exists "sellers own read" on public.sellers;
drop policy if exists "sellers own insert" on public.sellers;
drop policy if exists "sellers own update" on public.sellers;
drop policy if exists "sellers admin read" on public.sellers;
drop policy if exists "sellers admin update" on public.sellers;
create policy "sellers own read"    on public.sellers for select to authenticated using (user_id = auth.uid());
create policy "sellers own insert"  on public.sellers for insert to authenticated with check (user_id = auth.uid());
create policy "sellers own update"  on public.sellers for update to authenticated using (user_id = auth.uid() and status = 'active') with check (user_id = auth.uid() and status = 'active');
create policy "sellers admin read"  on public.sellers for select to authenticated using (public.is_admin());
create policy "sellers admin update" on public.sellers for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- A new seller application is always 'pending' until the admin accepts it.
-- Sellers can never change their own status or the admin's review note.
create or replace function public.sellers_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid(); new.status := 'pending'; new.review_note := null;
  else
    new.user_id := old.user_id; new.status := old.status; new.review_note := old.review_note;
  end if;
  return new;
end $$;
drop trigger if exists sellers_guard on public.sellers;
create trigger sellers_guard before insert or update on public.sellers for each row execute function public.sellers_guard();

-- product columns for sellers: owner, approval status, stock, sizes, colours
alter table public.products
  add column if not exists seller_id uuid references auth.users(id) on delete set null,
  add column if not exists status text not null default 'approved' check (status in ('pending','approved','rejected')),
  add column if not exists reject_reason text,
  add column if not exists stock int check (stock is null or stock >= 0),     -- null = stock not tracked (admin products)
  add column if not exists size_type text not null default 'none' check (size_type in ('none','letters','numbers')),
  add column if not exists sizes jsonb not null default '[]'::jsonb,           -- ["S","M","L"] or ["6","7","8"]
  add column if not exists colors jsonb not null default '[]'::jsonb;          -- [{"n":"Red","h":"#e11d48"}]

-- A seller can never set rating, reviews, featured, best seller, audience or visibility.
-- Every new or edited seller product goes back to "pending" until the admin approves it.
-- (Changing only the stock of an approved product does not need a new approval.)
create or replace function public.products_seller_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if tg_op = 'INSERT' then
    if not public.is_seller() then raise exception 'Only sellers can add products'; end if;
    new.seller_id := auth.uid();
    new.status := 'pending'; new.visible := false; new.reject_reason := null;
    new.audience := ''; new.rating := 4.5; new.reviews := 0;
    new.featured := false; new.best_seller := false; new.in_explore := false;   -- admin decides what shows in Explore / home
    new.pos_explore := 0; new.pos_shop := 0; new.pos_featured := 0; new.pos_best := 0;
    new.in_stock := coalesce(new.stock, 1) > 0;
    return new;
  end if;
  if old.seller_id is distinct from auth.uid() then return new; end if;   -- not the owner (for example a customer order lowering stock)
  new.seller_id := old.seller_id;
  new.audience := old.audience; new.rating := old.rating; new.reviews := old.reviews;
  new.featured := old.featured; new.best_seller := old.best_seller; new.in_explore := old.in_explore;
  new.pos_explore := old.pos_explore; new.pos_shop := old.pos_shop; new.pos_featured := old.pos_featured; new.pos_best := old.pos_best;
  if (new.name, new.category, new.price, new.old_price, new.image, new.images, new.description, new.size_type, new.sizes, new.colors)
     is not distinct from (old.name, old.category, old.price, old.old_price, old.image, old.images, old.description, old.size_type, old.sizes, old.colors) then
    new.status := old.status; new.visible := old.visible; new.reject_reason := old.reject_reason;
  else
    new.status := 'pending'; new.visible := false; new.reject_reason := null;
  end if;
  if new.stock is not null then new.in_stock := new.stock > 0; end if;
  return new;
end $$;
drop trigger if exists products_seller_guard on public.products;
create trigger products_seller_guard before insert or update on public.products for each row execute function public.products_seller_guard();

drop policy if exists "products seller read own" on public.products;
drop policy if exists "products seller insert" on public.products;
drop policy if exists "products seller update" on public.products;
drop policy if exists "products seller delete" on public.products;
create policy "products seller read own" on public.products for select to authenticated using (seller_id = auth.uid());
create policy "products seller insert" on public.products for insert to authenticated with check (public.is_seller() and seller_id = auth.uid());
create policy "products seller update" on public.products for update to authenticated using (seller_id = auth.uid() and public.is_seller()) with check (seller_id = auth.uid());
create policy "products seller delete" on public.products for delete to authenticated using (seller_id = auth.uid() and public.is_seller());

-- sellers may upload product photos
drop policy if exists "product images seller insert" on storage.objects;
create policy "product images seller insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_seller());

-- orders: store the chosen size / colour, check and lower the stock
-- payment options per product (seller chooses) and the online payment reference on orders
alter table public.products
  add column if not exists pay_cod boolean not null default true,
  add column if not exists pay_online boolean not null default false;
alter table public.products drop constraint if exists products_pay_any;
alter table public.products add constraint products_pay_any check (pay_cod or pay_online);
alter table public.orders add column if not exists pay_ref text;

create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare it jsonb; pr public.products; q int; sub numeric := 0; norm jsonb := '[]'::jsonb; sz text; cl text;
  pay text := case when new.payment = 'UPI / Card' then 'UPI / Card' else 'Cash on Delivery' end;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then raise exception 'Invalid item'; end if;
  if pay = 'UPI / Card' and coalesce(btrim(new.pay_ref), '') = '' then raise exception 'Payment reference missing'; end if;
  for it in select value from jsonb_array_elements(new.items) loop
    q := coalesce((it->>'q')::int, 0);
    select * into pr from public.products where id = (it->>'id')::bigint and visible and in_stock for update;
    if not found or q < 1 or q > 20 then raise exception 'Invalid item'; end if;
    if pr.stock is not null and pr.stock < q then raise exception 'Only % left in stock for %', pr.stock, pr.name; end if;
    if pay = 'Cash on Delivery' and not pr.pay_cod then raise exception 'Cash on Delivery is not available for %', pr.name; end if;
    if pay = 'UPI / Card' and not pr.pay_online then raise exception 'Online payment is not available for %', pr.name; end if;
    sz := nullif(left(it->>'s', 20), ''); cl := nullif(left(it->>'c', 30), '');
    if jsonb_array_length(pr.sizes) > 0 then
      if sz is null or not (pr.sizes ? sz) then raise exception 'Please choose a size for %', pr.name; end if;
    else sz := null; end if;
    if jsonb_array_length(pr.colors) > 0 then
      if cl is null or not exists (select 1 from jsonb_array_elements(pr.colors) c where c->>'n' = cl) then raise exception 'Please choose a colour for %', pr.name; end if;
    else cl := null; end if;
    if pr.stock is not null then
      update public.products set stock = stock - q, in_stock = (stock - q) > 0 where id = pr.id;
    end if;
    sub := sub + pr.price * q;
    norm := norm || jsonb_build_array(jsonb_build_object('id', pr.id, 'n', pr.name, 'i', pr.image, 'q', q, 'p', pr.price, 's', sz, 'c', cl));
  end loop;
  new.id := 'WK' || lpad((floor(random() * 1e8))::bigint::text, 8, '0');
  new.user_id := auth.uid();
  new.items := norm;
  new.subtotal := sub;
  new.shipping := case when sub >= 999 then 0 else 49 end;
  new.total := sub + new.shipping;
  new.status := 'pending'; new.stage := null; new.accepted_at := null;
  new.payment := pay;
  new.pay_ref := case when pay = 'UPI / Card' then left(btrim(new.pay_ref), 60) else null end;
  new.tracking_id := 'WKT' || lpad((floor(random() * 1e10))::bigint::text, 10, '0');
  return new;
end $$;

-- the seller sees ONLY the order lines that belong to their own products
drop function if exists public.seller_orders();
create or replace function public.seller_orders() returns table (
  id text, created_at timestamptz, status text, stage int, payment text,
  customer text, mobile text, address jsonb, lines jsonb, amount numeric)
language sql stable security definer set search_path = public as $$
  select o.id, o.created_at, o.status, o.stage, o.payment,
         o.address->>'name', o.address->>'m1', o.address,
         (select jsonb_agg(l) from jsonb_array_elements(o.items) l
           where exists (select 1 from public.products p where p.id = (l->>'id')::bigint and p.seller_id = auth.uid())),
         (select coalesce(sum((l->>'p')::numeric * (l->>'q')::numeric), 0) from jsonb_array_elements(o.items) l
           where exists (select 1 from public.products p where p.id = (l->>'id')::bigint and p.seller_id = auth.uid()))
  from public.orders o
  where public.is_seller()
    and exists (select 1 from jsonb_array_elements(o.items) l join public.products p on p.id = (l->>'id')::bigint where p.seller_id = auth.uid())
  order by o.created_at desc
$$;

-- Seller sign-up: the application reaches the admin immediately, even when the email is not confirmed yet.
create or replace function public.handle_seller_signup() returns trigger
language plpgsql security definer set search_path = public as $$
declare a jsonb := new.raw_user_meta_data -> 'seller_app';
begin
  if a is null or jsonb_typeof(a) <> 'object' then return new; end if;
  insert into public.sellers (user_id, business_name, owner_name, business_type, mobile, email, address, gstin, status)
  values (new.id, left(coalesce(a->>'business_name',''), 60), left(coalesce(a->>'owner_name',''), 60),
          left(coalesce(nullif(a->>'business_type',''), 'Individual'), 30), left(a->>'mobile', 10),
          left(coalesce(nullif(a->>'email',''), new.email), 80),
          case when jsonb_typeof(a->'address') = 'object' then a->'address' else '{}'::jsonb end,
          nullif(left(a->>'gstin', 15), ''), 'pending')
  on conflict (user_id) do nothing;
  return new;
exception when others then
  return new;   -- never block the sign-up itself
end $$;
drop trigger if exists on_auth_user_seller on auth.users;
create trigger on_auth_user_seller after insert on auth.users for each row execute function public.handle_seller_signup();

-- live updates for the admin Sellers pages
do $$ begin
  begin alter publication supabase_realtime add table public.sellers; exception when others then null; end;
end $$;

-- seller products are never added to home sections automatically (the admin chooses)
update public.products set in_explore = false where seller_id is not null and status <> 'approved';

-- last updated time on products (the admin lists show the newest first)
alter table public.products add column if not exists updated_at timestamptz not null default now();
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();


-- 12) Most-bought / most-demand ranking for the home page (aggregate only, no personal data)
create or replace function public.product_demand() returns table (product_id bigint, units bigint)
language sql stable security definer set search_path = public as $$
  select (i->>'id')::bigint as product_id, sum(coalesce((i->>'q')::int,1))::bigint as units
  from public.orders o, jsonb_array_elements(o.items) i
  where o.status <> 'rejected' and (i->>'id') ~ '^[0-9]+$'
  group by 1
$$;
revoke all on function public.product_demand() from public;
grant execute on function public.product_demand() to anon, authenticated;


-- 13) Explore "All" tab: rename it, and choose per product whether it is listed in All
alter table public.products add column if not exists in_all boolean not null default true;
create table if not exists public.site_settings (
  key text primary key,
  value text not null default ''
);
alter table public.site_settings enable row level security;
drop policy if exists "settings public read" on public.site_settings;
drop policy if exists "settings admin write" on public.site_settings;
create policy "settings public read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings admin write" on public.site_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
do $$ begin
  begin alter publication supabase_realtime add table public.site_settings; exception when others then null; end;
end $$;


-- 14) Razorpay: payments verified by the verify-payment edge function (signature checked there).
--     Customers cannot read or write this table; only the edge function (service role) and the
--     orders trigger below touch it. A payment can be used for one order, by the customer who paid,
--     and only when the amount paid equals the order total.
create table if not exists public.payments (
  razorpay_payment_id text primary key,
  razorpay_order_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_paise integer not null check (amount_paise >= 100),
  order_id text,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;

create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare it jsonb; pr public.products; q int; sub numeric := 0; norm jsonb := '[]'::jsonb; sz text; cl text; pm public.payments;
  pay text := case when new.payment = 'UPI / Card' then 'UPI / Card' else 'Cash on Delivery' end;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then raise exception 'Invalid item'; end if;
  if pay = 'UPI / Card' and coalesce(btrim(new.pay_ref), '') = '' then raise exception 'Payment reference missing'; end if;
  if pay = 'UPI / Card' then
    select * into pm from public.payments where razorpay_payment_id = btrim(new.pay_ref) and user_id = auth.uid() and order_id is null for update;
    if not found then raise exception 'Payment not verified'; end if;
  end if;
  for it in select value from jsonb_array_elements(new.items) loop
    q := coalesce((it->>'q')::int, 0);
    select * into pr from public.products where id = (it->>'id')::bigint and visible and in_stock for update;
    if not found or q < 1 or q > 20 then raise exception 'Invalid item'; end if;
    if pr.stock is not null and pr.stock < q then raise exception 'Only % left in stock for %', pr.stock, pr.name; end if;
    if pay = 'Cash on Delivery' and not pr.pay_cod then raise exception 'Cash on Delivery is not available for %', pr.name; end if;
    if pay = 'UPI / Card' and not pr.pay_online then raise exception 'Online payment is not available for %', pr.name; end if;
    sz := nullif(left(it->>'s', 20), ''); cl := nullif(left(it->>'c', 30), '');
    if jsonb_array_length(pr.sizes) > 0 then
      if sz is null or not (pr.sizes ? sz) then raise exception 'Please choose a size for %', pr.name; end if;
    else sz := null; end if;
    if jsonb_array_length(pr.colors) > 0 then
      if cl is null or not exists (select 1 from jsonb_array_elements(pr.colors) c where c->>'n' = cl) then raise exception 'Please choose a colour for %', pr.name; end if;
    else cl := null; end if;
    if pr.stock is not null then
      update public.products set stock = stock - q, in_stock = (stock - q) > 0 where id = pr.id;
    end if;
    sub := sub + pr.price * q;
    norm := norm || jsonb_build_array(jsonb_build_object('id', pr.id, 'n', pr.name, 'i', pr.image, 'q', q, 'p', pr.price, 's', sz, 'c', cl));
  end loop;
  new.id := 'WK' || lpad((floor(random() * 1e8))::bigint::text, 8, '0');
  new.user_id := auth.uid();
  new.items := norm;
  new.subtotal := sub;
  new.shipping := case when sub >= 999 then 0 else 49 end;
  new.total := sub + new.shipping;
  new.status := 'pending'; new.stage := null; new.accepted_at := null;
  new.payment := pay;
  new.pay_ref := case when pay = 'UPI / Card' then left(btrim(new.pay_ref), 60) else null end;
  if pay = 'UPI / Card' then
    if pm.amount_paise <> round(new.total * 100) then raise exception 'Payment amount does not match'; end if;
    update public.payments set order_id = new.id where razorpay_payment_id = pm.razorpay_payment_id;
  end if;
  new.tracking_id := 'WKT' || lpad((floor(random() * 1e10))::bigint::text, 10, '0');
  return new;
end $$;


-- 15) Security hardening (run after everything above; safe to re-run)
-- a) Only logged-in sellers can call seller_orders() (it already returns nothing for anyone else)
revoke execute on function public.seller_orders() from public, anon;
grant execute on function public.seller_orders() to authenticated;

-- b) Product photo bucket: images only, max 5 MB (blocks SVG/HTML uploads that could carry scripts)
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
 where id = 'product-images';

-- c) Size limits so nobody can store huge text (existing rows are not re-checked)
alter table public.products drop constraint if exists products_len_chk;
alter table public.products add constraint products_len_chk check (
  char_length(name) <= 120 and char_length(category) <= 60 and char_length(image) <= 600 and char_length(description) <= 4000
) not valid;
alter table public.orders drop constraint if exists orders_size_chk;
alter table public.orders add constraint orders_size_chk check (
  octet_length(address::text) <= 2000 and octet_length(items::text) <= 20000
) not valid;
alter table public.profiles drop constraint if exists profiles_size_chk;
alter table public.profiles add constraint profiles_size_chk check (
  octet_length(address::text) <= 2000 and char_length(coalesce(name, '')) <= 80 and char_length(coalesce(email, '')) <= 120
) not valid;

-- d) Anti-spam: a customer can place at most 20 orders per hour and at most 50 lines per order
create or replace function public.orders_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if jsonb_typeof(new.items) = 'array' and jsonb_array_length(new.items) > 50 then raise exception 'Invalid item'; end if;
  if (select count(*) from public.orders where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many orders. Please try again later.';
  end if;
  return new;
end $$;
drop trigger if exists orders_a_limit on public.orders;
create trigger orders_a_limit before insert on public.orders for each row execute function public.orders_limit();


-- 16) Seller payouts: money the admin has paid to a seller (admin records it, seller sees it)
create table if not exists public.seller_payouts (
  id bigint generated always as identity primary key,
  seller_id uuid not null references public.sellers(user_id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0 and amount <= 10000000),
  note text not null default '' check (char_length(note) <= 200),
  paid_at timestamptz not null default now(),
  seen_at timestamptz,
  created_by uuid default auth.uid()
);
create index if not exists seller_payouts_seller_idx on public.seller_payouts (seller_id, paid_at desc);
alter table public.seller_payouts enable row level security;
drop policy if exists "payouts admin all" on public.seller_payouts;
drop policy if exists "payouts seller read own" on public.seller_payouts;
create policy "payouts admin all" on public.seller_payouts for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "payouts seller read own" on public.seller_payouts for select to authenticated using (seller_id = auth.uid());
-- the seller can only mark their own new payments as seen (cannot change amounts)
create or replace function public.seller_ack_payouts() returns void
language sql security definer set search_path = public as $$
  update public.seller_payouts set seen_at = now() where seller_id = auth.uid() and seen_at is null
$$;
revoke execute on function public.seller_ack_payouts() from public, anon;
grant execute on function public.seller_ack_payouts() to authenticated;
do $$ begin
  begin alter publication supabase_realtime add table public.seller_payouts; exception when others then null; end;
end $$;


-- 17) Seller purchase price (cost). Kept in its own table so customers can never read it:
--     only the seller who owns the product and the admin can see it.
create table if not exists public.product_costs (
  product_id bigint primary key references public.products(id) on delete cascade,
  seller_id uuid not null references public.sellers(user_id) on delete cascade,
  cost numeric(12,2) not null check (cost > 0 and cost <= 10000000),
  updated_at timestamptz not null default now()
);
alter table public.product_costs enable row level security;
drop policy if exists "costs admin all" on public.product_costs;
drop policy if exists "costs seller read" on public.product_costs;
drop policy if exists "costs seller insert" on public.product_costs;
drop policy if exists "costs seller update" on public.product_costs;
create policy "costs admin all" on public.product_costs for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "costs seller read" on public.product_costs for select to authenticated using (seller_id = auth.uid());
create policy "costs seller insert" on public.product_costs for insert to authenticated
  with check (seller_id = auth.uid() and exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()));
create policy "costs seller update" on public.product_costs for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid() and exists (select 1 from public.products p where p.id = product_id and p.seller_id = auth.uid()));


-- 18) Extra charge for Cash on Delivery, set per product (per piece). Added only when the buyer pays by Cash on Delivery.
alter table public.products add column if not exists cod_fee numeric(8,2) not null default 0 check (cod_fee >= 0);
-- no upper limit on the COD charge (for databases that already had the old 0-500 limit):
alter table public.products drop constraint if exists products_cod_fee_check;
alter table public.products add constraint products_cod_fee_check check (cod_fee >= 0);
alter table public.orders add column if not exists cod_fee numeric(8,2) not null default 0;
-- a seller changing the COD charge sends the product for approval again (it changes what buyers pay)
create or replace function public.products_cod_fee_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if old.seller_id = auth.uid() and new.cod_fee is distinct from old.cod_fee then
    new.status := 'pending'; new.visible := false; new.reject_reason := null;
  end if;
  return new;
end $$;
drop trigger if exists products_seller_guard_b on public.products;
create trigger products_seller_guard_b before update on public.products for each row execute function public.products_cod_fee_guard();
-- the order total now includes the COD charge (calculated here, never trusted from the browser)
create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare it jsonb; pr public.products; q int; sub numeric := 0; fee numeric := 0; norm jsonb := '[]'::jsonb; sz text; cl text; pm public.payments;
  pay text := case when new.payment = 'UPI / Card' then 'UPI / Card' else 'Cash on Delivery' end;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then raise exception 'Invalid item'; end if;
  if pay = 'UPI / Card' and coalesce(btrim(new.pay_ref), '') = '' then raise exception 'Payment reference missing'; end if;
  if pay = 'UPI / Card' then
    select * into pm from public.payments where razorpay_payment_id = btrim(new.pay_ref) and user_id = auth.uid() and order_id is null for update;
    if not found then raise exception 'Payment not verified'; end if;
  end if;
  for it in select value from jsonb_array_elements(new.items) loop
    q := coalesce((it->>'q')::int, 0);
    select * into pr from public.products where id = (it->>'id')::bigint and visible and in_stock for update;
    if not found or q < 1 or q > 20 then raise exception 'Invalid item'; end if;
    if pr.stock is not null and pr.stock < q then raise exception 'Only % left in stock for %', pr.stock, pr.name; end if;
    if pay = 'Cash on Delivery' and not pr.pay_cod then raise exception 'Cash on Delivery is not available for %', pr.name; end if;
    if pay = 'UPI / Card' and not pr.pay_online then raise exception 'Online payment is not available for %', pr.name; end if;
    sz := nullif(left(it->>'s', 20), ''); cl := nullif(left(it->>'c', 30), '');
    if jsonb_array_length(pr.sizes) > 0 then
      if sz is null or not (pr.sizes ? sz) then raise exception 'Please choose a size for %', pr.name; end if;
    else sz := null; end if;
    if jsonb_array_length(pr.colors) > 0 then
      if cl is null or not exists (select 1 from jsonb_array_elements(pr.colors) c where c->>'n' = cl) then raise exception 'Please choose a colour for %', pr.name; end if;
    else cl := null; end if;
    if pr.stock is not null then
      update public.products set stock = stock - q, in_stock = (stock - q) > 0 where id = pr.id;
    end if;
    sub := sub + pr.price * q;
    if pay = 'Cash on Delivery' then fee := fee + pr.cod_fee * q; end if;
    norm := norm || jsonb_build_array(jsonb_build_object('id', pr.id, 'n', pr.name, 'i', pr.image, 'q', q, 'p', pr.price, 's', sz, 'c', cl));
  end loop;
  new.id := 'WK' || lpad((floor(random() * 1e8))::bigint::text, 8, '0');
  new.user_id := auth.uid();
  new.items := norm;
  new.subtotal := sub;
  new.shipping := case when sub >= 999 then 0 else 49 end;
  new.cod_fee := fee;
  new.total := sub + new.shipping + fee;
  new.status := 'pending'; new.stage := null; new.accepted_at := null;
  new.payment := pay;
  new.pay_ref := case when pay = 'UPI / Card' then left(btrim(new.pay_ref), 60) else null end;
  if pay = 'UPI / Card' then
    if pm.amount_paise <> round(new.total * 100) then raise exception 'Payment amount does not match'; end if;
    update public.payments set order_id = new.id where razorpay_payment_id = pm.razorpay_payment_id;
  end if;
  new.tracking_id := 'WKT' || lpad((floor(random() * 1e10))::bigint::text, 10, '0');
  return new;
end $$;


-- 19) Delivery charge per product, orders are confirmed automatically, admin can remove sellers
alter table public.products add column if not exists delivery_fee numeric(8,2) not null default 0 check (delivery_fee >= 0);
-- orders already waiting for approval become confirmed
update public.orders set status = 'accepted', accepted_at = coalesce(accepted_at, now()), stage = coalesce(stage, 0) where status = 'pending';
-- a seller changing the COD charge or the delivery charge sends the product for approval again
create or replace function public.products_cod_fee_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then return new; end if;
  if old.seller_id = auth.uid() and (new.cod_fee is distinct from old.cod_fee or new.delivery_fee is distinct from old.delivery_fee) then
    new.status := 'pending'; new.visible := false; new.reject_reason := null;
  end if;
  return new;
end $$;
-- order total = items + delivery charge of each product (once per product) + COD charge (Cash on Delivery only); the order is confirmed on the spot
create or replace function public.orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare it jsonb; pr public.products; q int; sub numeric := 0; fee numeric := 0; ship numeric := 0; seen bigint[] := '{}'; norm jsonb := '[]'::jsonb; sz text; cl text; pm public.payments;
  pay text := case when new.payment = 'UPI / Card' then 'UPI / Card' else 'Cash on Delivery' end;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then raise exception 'Invalid item'; end if;
  if pay = 'UPI / Card' and coalesce(btrim(new.pay_ref), '') = '' then raise exception 'Payment reference missing'; end if;
  if pay = 'UPI / Card' then
    select * into pm from public.payments where razorpay_payment_id = btrim(new.pay_ref) and user_id = auth.uid() and order_id is null for update;
    if not found then raise exception 'Payment not verified'; end if;
  end if;
  for it in select value from jsonb_array_elements(new.items) loop
    q := coalesce((it->>'q')::int, 0);
    select * into pr from public.products where id = (it->>'id')::bigint and visible and in_stock for update;
    if not found or q < 1 or q > 20 then raise exception 'Invalid item'; end if;
    if pr.stock is not null and pr.stock < q then raise exception 'Only % left in stock for %', pr.stock, pr.name; end if;
    if pay = 'Cash on Delivery' and not pr.pay_cod then raise exception 'Cash on Delivery is not available for %', pr.name; end if;
    if pay = 'UPI / Card' and not pr.pay_online then raise exception 'Online payment is not available for %', pr.name; end if;
    sz := nullif(left(it->>'s', 20), ''); cl := nullif(left(it->>'c', 30), '');
    if jsonb_array_length(pr.sizes) > 0 then
      if sz is null or not (pr.sizes ? sz) then raise exception 'Please choose a size for %', pr.name; end if;
    else sz := null; end if;
    if jsonb_array_length(pr.colors) > 0 then
      if cl is null or not exists (select 1 from jsonb_array_elements(pr.colors) c where c->>'n' = cl) then raise exception 'Please choose a colour for %', pr.name; end if;
    else cl := null; end if;
    if pr.stock is not null then
      update public.products set stock = stock - q, in_stock = (stock - q) > 0 where id = pr.id;
    end if;
    sub := sub + pr.price * q;
    if pay = 'Cash on Delivery' then fee := fee + pr.cod_fee * q; end if;
    if not (pr.id = any(seen)) then ship := ship + pr.delivery_fee; seen := seen || pr.id; end if;
    norm := norm || jsonb_build_array(jsonb_build_object('id', pr.id, 'n', pr.name, 'i', pr.image, 'q', q, 'p', pr.price, 's', sz, 'c', cl));
  end loop;
  new.id := 'WK' || lpad((floor(random() * 1e8))::bigint::text, 8, '0');
  new.user_id := auth.uid();
  new.items := norm;
  new.subtotal := sub;
  new.shipping := ship;
  new.cod_fee := fee;
  new.total := sub + new.shipping + fee;
  new.status := 'accepted'; new.stage := 0; new.accepted_at := now();
  new.payment := pay;
  new.pay_ref := case when pay = 'UPI / Card' then left(btrim(new.pay_ref), 60) else null end;
  if pay = 'UPI / Card' then
    if pm.amount_paise <> round(new.total * 100) then raise exception 'Payment amount does not match'; end if;
    update public.payments set order_id = new.id where razorpay_payment_id = pm.razorpay_payment_id;
  end if;
  new.tracking_id := 'WKT' || lpad((floor(random() * 1e10))::bigint::text, 10, '0');
  return new;
end $$;

-- admin removes a seller: their products, costs and payment records are deleted, past orders stay in the records
create or replace function public.admin_remove_seller(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not allowed'; end if;
  delete from public.products where seller_id = uid;
  delete from public.sellers where user_id = uid;
end $$;
revoke execute on function public.admin_remove_seller(uuid) from public, anon;
grant execute on function public.admin_remove_seller(uuid) to authenticated;


-- 20) Sellers update the delivery status of their own orders
drop function if exists public.seller_orders();
create function public.seller_orders() returns table (
  id text, created_at timestamptz, status text, stage int, payment text,
  customer text, mobile text, address jsonb, lines jsonb, amount numeric, solo boolean)
language sql stable security definer set search_path = public as $$
  select o.id, o.created_at, o.status, o.stage, o.payment,
         o.address->>'name', o.address->>'m1', o.address,
         (select jsonb_agg(l) from jsonb_array_elements(o.items) l
           where exists (select 1 from public.products p where p.id = (l->>'id')::bigint and p.seller_id = auth.uid())),
         (select coalesce(sum((l->>'p')::numeric * (l->>'q')::numeric), 0) from jsonb_array_elements(o.items) l
           where exists (select 1 from public.products p where p.id = (l->>'id')::bigint and p.seller_id = auth.uid())),
         -- true when every item in the order is this seller's (only then the seller may change the status)
         not exists (select 1 from jsonb_array_elements(o.items) l
           where not exists (select 1 from public.products p where p.id = (l->>'id')::bigint and p.seller_id = auth.uid()))
  from public.orders o
  where public.is_seller()
    and exists (select 1 from jsonb_array_elements(o.items) l join public.products p on p.id = (l->>'id')::bigint where p.seller_id = auth.uid())
  order by o.created_at desc
$$;
revoke execute on function public.seller_orders() from public, anon;
grant execute on function public.seller_orders() to authenticated;

create or replace function public.seller_set_stage(oid text, st int) returns void
language plpgsql security definer set search_path = public as $$
declare cur int; stt text; its jsonb;
begin
  if not public.is_seller() then raise exception 'Not allowed'; end if;
  select stage, status, items into cur, stt, its from public.orders where id = oid;
  if not found then raise exception 'Order not found'; end if;
  if stt <> 'accepted' then raise exception 'This order is not active'; end if;
  if st is null or st < 0 or st > 4 then raise exception 'Invalid status'; end if;
  if exists (select 1 from jsonb_array_elements(its) l
             where not exists (select 1 from public.products p where p.id = (l->>'id')::bigint and p.seller_id = auth.uid())) then
    raise exception 'This order also has items from Peedya or another seller, so Peedya updates its status.';
  end if;
  if st < coalesce(cur, 0) then raise exception 'The status cannot go back.'; end if;
  update public.orders set stage = st where id = oid;
end $$;
revoke execute on function public.seller_set_stage(text, int) from public, anon;
grant execute on function public.seller_set_stage(text, int) to authenticated;


-- 21) Orders only from customers who verified their mobile number with an OTP (no anonymous accounts).
--     Every customer table already allows a user to read and write only rows where user_id = auth.uid().
create or replace function public.orders_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Please log in with your mobile number first.'; end if;
  if jsonb_typeof(new.items) = 'array' and jsonb_array_length(new.items) > 50 then raise exception 'Invalid item'; end if;
  if (select count(*) from public.orders where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many orders. Please try again later.';
  end if;
  return new;
end $$;


-- 22) Peedya virtual card (loyalty card): one per verified customer, 16-digit unique number + 3-digit security code.
--     Tier and points come from the number of orders (calculated in the app). The card can also be used to log in
--     (see supabase/functions/card-login): 5 wrong security codes lock that card, then the lock time doubles (1h, 2h ... 24h).
create table if not exists public.loyalty_cards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  card_number text not null unique check (card_number ~ '^[0-9]{16}$'),
  security_code text not null check (security_code ~ '^[0-9]{3}$'),
  created_at timestamptz not null default now(),
  fails int not null default 0,
  locked_until timestamptz
);
alter table public.loyalty_cards enable row level security;
drop policy if exists "cards own read" on public.loyalty_cards;
create policy "cards own read" on public.loyalty_cards for select to authenticated using (user_id = auth.uid());
-- no insert/update/delete policies: customers can never write to this table directly

create or replace function public.make_card_number() returns text
language plpgsql as $$
declare body text; i int; s int := 0; d int;
begin
  body := '7' || lpad((((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 15))::bit(60))::bigint) % 100000000000000)::text, 14, '0');
  for i in 1..15 loop  -- Luhn check digit, like a real card number
    d := substr(body, 16 - i, 1)::int;
    if i % 2 = 1 then d := d * 2; if d > 9 then d := d - 9; end if; end if;
    s := s + d;
  end loop;
  return body || ((10 - (s % 10)) % 10)::text;
end $$;

create or replace function public.make_card_code() returns text
language sql as $$
  select lpad((((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 7))::bit(28))::bigint) % 1000)::text, 3, '0')
$$;

create or replace function public.get_my_card() returns table (card_number text, security_code text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare uid uuid := auth.uid(); n int := 0;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Log in with your mobile number to get your card'; end if;
  if not exists (select 1 from public.loyalty_cards c where c.user_id = uid) then
    loop
      n := n + 1;
      begin
        insert into public.loyalty_cards (user_id, card_number, security_code) values (uid, public.make_card_number(), public.make_card_code());
        exit;
      exception when unique_violation then
        if exists (select 1 from public.loyalty_cards c where c.user_id = uid) then exit; end if;
        if n > 10 then raise exception 'Could not create the card, please try again'; end if;
      end;
    end loop;
  end if;
  return query select c.card_number, c.security_code, c.created_at from public.loyalty_cards c where c.user_id = uid;
end $$;
revoke execute on function public.get_my_card() from public, anon;
grant execute on function public.get_my_card() to authenticated;

create or replace function public.reset_my_card_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text := public.make_card_code();
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Not signed in'; end if;
  update public.loyalty_cards set security_code = c, fails = 0, locked_until = null where user_id = auth.uid();
  if not found then raise exception 'No card yet'; end if;
  return c;
end $$;
revoke execute on function public.reset_my_card_code() from public, anon;
grant execute on function public.reset_my_card_code() to authenticated;

-- one atomic check per attempt (row is locked, so parallel guesses cannot skip the counter). Only the card-login edge function may call it.
create or replace function public.card_try(p_card text, p_code text) returns table (ok boolean, uid uuid, lock_until timestamptz)
language plpgsql security definer set search_path = public as $$
declare r public.loyalty_cards%rowtype; f int; lk timestamptz;
begin
  select * into r from public.loyalty_cards where card_number = p_card for update;
  if not found then return query select false, null::uuid, null::timestamptz; return; end if;
  if r.locked_until is not null and r.locked_until > now() then return query select false, null::uuid, r.locked_until; return; end if;
  if r.security_code = p_code then
    update public.loyalty_cards set fails = 0, locked_until = null where user_id = r.user_id;
    return query select true, r.user_id, null::timestamptz; return;
  end if;
  f := r.fails + 1; lk := r.locked_until;
  if f % 5 = 0 then lk := now() + make_interval(mins => least(1440, 60 * (2 ^ (f / 5 - 1))::int)); end if;
  update public.loyalty_cards set fails = f, locked_until = lk where user_id = r.user_id;
  return query select false, null::uuid, case when f % 5 = 0 then lk else null::timestamptz end;
end $$;
revoke execute on function public.card_try(text, text) from public, anon, authenticated;
grant execute on function public.card_try(text, text) to service_role;


-- 23) Order cancelled: stock goes back, a cancelled order cannot be reopened, a delivered order cannot be cancelled
create or replace function public.orders_cancel_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare l jsonb;
begin
  if old.status = 'rejected' and new.status is distinct from 'rejected' then raise exception 'A cancelled order cannot be reopened.'; end if;
  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    if old.stage = 4 then raise exception 'A delivered order cannot be cancelled.'; end if;
    for l in select * from jsonb_array_elements(old.items) loop
      update public.products set stock = stock + coalesce((l->>'q')::int, 0), in_stock = true
       where id = (l->>'id')::bigint and stock is not null;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists orders_cancel_guard on public.orders;
create trigger orders_cancel_guard before update on public.orders for each row execute function public.orders_cancel_guard();

-- a seller may cancel (status -1) or move forward the status of an order that has only their items
create or replace function public.seller_set_stage(oid text, st int) returns void
language plpgsql security definer set search_path = public as $$
declare cur int; stt text; its jsonb;
begin
  if not public.is_seller() then raise exception 'Not allowed'; end if;
  select stage, status, items into cur, stt, its from public.orders where id = oid;
  if not found then raise exception 'Order not found'; end if;
  if stt <> 'accepted' then raise exception 'This order is not active'; end if;
  if st is null or st < -1 or st > 4 then raise exception 'Invalid status'; end if;
  if exists (select 1 from jsonb_array_elements(its) l
             where not exists (select 1 from public.products p where p.id = (l->>'id')::bigint and p.seller_id = auth.uid())) then
    raise exception 'This order also has items from Peedya or another seller, so Peedya updates its status.';
  end if;
  if st = -1 then
    update public.orders set status = 'rejected' where id = oid;  -- the trigger above puts the stock back
    return;
  end if;
  if st < coalesce(cur, 0) then raise exception 'The status cannot go back.'; end if;
  update public.orders set stage = st where id = oid;
end $$;
revoke execute on function public.seller_set_stage(text, int) from public, anon;
grant execute on function public.seller_set_stage(text, int) to authenticated;


-- 24) The mobile number is stored with every order, and earlier orders follow the number to the verified account.
--     A customer's account is the OTP-verified number, so the same number shows the same orders on every phone and computer.
alter table public.orders add column if not exists mobile text;
create index if not exists orders_mobile_idx on public.orders (mobile);
-- the login number is taken from the signed login token, not from the form, so it cannot be faked
create or replace function public.orders_set_mobile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.mobile := coalesce(
    nullif(regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '^\+?91', ''), ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'mobile', ''),
    new.address ->> 'm1');
  return new;
end $$;
drop trigger if exists orders_b_mobile on public.orders;
create trigger orders_b_mobile before insert on public.orders for each row execute function public.orders_set_mobile();
update public.orders o set mobile = coalesce((select p.mobile from public.profiles p where p.user_id = o.user_id), o.address ->> 'm1') where o.mobile is null;

-- Called after a customer logs in with an OTP: orders, messages and profile made earlier on this number
-- with an anonymous (no-OTP) account are moved to the verified account. Only the real owner of the number can do this.
create or replace function public.claim_my_orders() returns int
language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid(); ph text; olds uuid[]; n int := 0;
begin
  if me is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return 0; end if;
  ph := regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '^\+?91', '');
  if ph !~ '^[6-9][0-9]{9}$' then return 0; end if;
  olds := array(select u.id from auth.users u where u.is_anonymous and u.id <> me and u.raw_user_meta_data ->> 'mobile' = ph)
       || array(select distinct o.user_id from public.orders o join auth.users u on u.id = o.user_id
                where u.is_anonymous and o.user_id <> me and o.mobile = ph);
  if coalesce(array_length(olds, 1), 0) = 0 then return 0; end if;
  update public.orders set user_id = me where user_id = any (olds);
  get diagnostics n = row_count;
  update public.messages set user_id = me where user_id = any (olds);
  update public.profiles set user_id = me
   where user_id = (select p.user_id from public.profiles p where p.user_id = any (olds) order by p.created_at desc limit 1)
     and not exists (select 1 from public.profiles q where q.user_id = me);
  return n;
end $$;
revoke execute on function public.claim_my_orders() from public, anon;
grant execute on function public.claim_my_orders() to authenticated;


-- 25) Admin purchase price (cost) for the admin's own products, to show "Admin profit" on the dashboard.
--     Admin products have no seller, so seller_id may be empty. Only the admin can read or write those rows.
alter table public.product_costs alter column seller_id drop not null;


-- 26) Customer login with mobile number + password (no SMS). The number is the login id (number@domain), so the same
--     number and password open the same account on every phone and computer. Each account only sees its own rows.
create or replace function public.customer_exists(p_mobile text) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select p_mobile ~ '^[6-9][0-9]{9}$'
     and exists (select 1 from auth.users u where u.email is not null and split_part(u.email, '@', 1) = p_mobile)
$$;
revoke execute on function public.customer_exists(text) from public;
grant execute on function public.customer_exists(text) to anon, authenticated;

-- the order's mobile number comes from the signed login token (the login id), not from the form
create or replace function public.orders_set_mobile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.mobile := coalesce(
    nullif(substring(coalesce(auth.jwt() ->> 'email', '') from '^([6-9][0-9]{9})@'), ''),
    nullif(regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '^\+?91', ''), ''),
    nullif(auth.jwt() -> 'user_metadata' ->> 'mobile', ''),
    new.address ->> 'm1');
  return new;
end $$;


-- 27) Customers can order with just their mobile number (a private guest account on their browser).
--     The guest can later set a password for the number to protect the account and use it on other devices.
create or replace function public.orders_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if jsonb_typeof(new.items) = 'array' and jsonb_array_length(new.items) > 50 then raise exception 'Invalid item'; end if;
  if (select count(*) from public.orders where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many orders. Please try again later.';
  end if;
  return new;
end $$;
