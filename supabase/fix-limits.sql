-- Run this alone in the Supabase SQL Editor if "Promo banners" still stops at 3 or "Slider" at 5.
-- (It only changes the two limits to 10; nothing else.)
create or replace function public.promo_banners_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.promo_banners) >= 10 then raise exception 'Maximum 10 promo banners'; end if;
  return new;
end $$;
create or replace function public.hero_slides_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.hero_slides) >= 10 then raise exception 'Maximum 10 hero slides'; end if;
  return new;
end $$;
