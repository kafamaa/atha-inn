-- =========================================================
-- ATHA INN — database (run in Supabase → SQL Editor)
-- Safe to run again: it updates an older version in place.
-- =========================================================
create extension if not exists btree_gist;

-- ---------- admin accounts (everyone has the same access) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  email text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;
-- kept for compatibility: every admin account has full access
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_staff()
$$;

-- The very first account created becomes an admin automatically.
-- Later accounts are added by an admin from Settings → Admin accounts.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles) then
    insert into public.profiles (id, name, email, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email, 'admin');
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- business settings & website text ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Atha Inn',
  updated_at timestamptz default now()
);
alter table public.settings
  add column if not exists island_guide jsonb,
  add column if not exists tagline text default 'A calm island guesthouse in Kanditheemu',
  add column if not exists welcome text default 'Welcome to Atha Inn, a small family-run guesthouse on the island of Kanditheemu, Shaviyani Atoll.',
  add column if not exists about text default 'Clean, comfortable rooms with friendly local hosts.',
  add column if not exists kitchen_info text default '',
  add column if not exists house_info text default '',
  add column if not exists address text default 'ATHA / SH.KANDITHEEMU, Maldives',
  add column if not exists phones text default '+960 9467278',
  add column if not exists whatsapp text default '9609467278',
  add column if not exists email text default '',
  add column if not exists tin text default '',
  add column if not exists map_url text default '',
  add column if not exists logo_url text default '',
  add column if not exists hero_url text default '',
  add column if not exists base text not null default 'MVR',
  add column if not exists fx numeric not null default 15.42,
  add column if not exists tgst numeric not null default 17,
  add column if not exists service numeric not null default 10,
  add column if not exists green_tax numeric not null default 6,
  add column if not exists bank text default E'Account name: Ahmedh Nazeem\nAccount number: 7704260704101\nBank: Bank of Maldives',
  add column if not exists footer_q text default 'Please confirm this quotation to reserve the rooms. Thank you.',
  add column if not exists footer_i text default 'Thank you for staying with us.',
  add column if not exists footer_r text default 'Thank you. This receipt confirms the payment above.',
  add column if not exists inv_pre text default 'AT',
  add column if not exists inv_next int default 3,
  add column if not exists qt_pre text default 'QT',
  add column if not exists qt_next int default 1,
  add column if not exists rc_pre text default 'RC',
  add column if not exists rc_next int default 1,
  add column if not exists sig_on boolean default true;
insert into public.settings (id) values (1) on conflict do nothing;

create table if not exists public.secrets (
  id int primary key default 1 check (id = 1),
  signature text default ''
);
insert into public.secrets (id) values (1) on conflict do nothing;

-- ---------- rooms ----------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default '',
  rate numeric not null default 0,
  max_guests int not null default 2,
  status text not null default 'ready',
  description text default '',
  photo text default '',
  notes text default '',
  is_public boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.rooms add column if not exists facilities text default '';

-- ---------- reservations ----------
-- status: request (from website, no room yet) → booked (Confirmed) → in (Checked in) → out (Checked out); or cancel
-- A reservation for several rooms is several rows sharing one group_id.
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  guest text not null,
  phone text default '',
  email text default '',
  country text default '',
  id_no text default '',
  room_id uuid references public.rooms on delete set null,
  check_in date not null,
  check_out date not null,
  adults int not null default 1,
  children int not null default 0,
  rate numeric not null default 0,
  status text not null default 'booked',
  source text default 'Walk-in',
  notes text default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint dates_ok check (check_out > check_in),
  constraint bookings_no_overlap exclude using gist (
    room_id with =, daterange(check_in, check_out) with &&
  ) where (status in ('booked','in'))
);
alter table public.bookings
  add column if not exists group_id uuid,
  add column if not exists rooms_wanted int not null default 1;
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check (status in ('request','booked','in','out','cancel'));
alter table public.bookings drop constraint if exists room_needed;
alter table public.bookings add constraint room_needed check (status in ('request','cancel') or room_id is not null);

create or replace function public.bookings_group() returns trigger language plpgsql as $$
begin
  if new.group_id is null then new.group_id := new.id; end if;
  return new;
end $$;
drop trigger if exists bookings_group on public.bookings;
create trigger bookings_group before insert on public.bookings for each row execute function public.bookings_group();
update public.bookings set group_id = id where group_id is null;

-- move requests from the old version (if any) into reservations
do $$ begin
  if to_regclass('public.booking_requests') is not null then
    insert into public.bookings (guest, phone, email, country, check_in, check_out, adults, children, notes, status, source, created_at)
    select guest, phone, email, country, check_in, check_out, adults, children, message, 'request', 'Website', created_at
    from public.booking_requests where status = 'new';
    drop table public.booking_requests cascade;
  end if;
end $$;

-- ---------- quotations & invoices ----------
create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('quote','invoice')),
  no text,
  seq int,
  yr int,
  date date not null default current_date,
  due date,
  customer text not null,
  caddr text default '',
  phone text default '',
  booking_id uuid,
  currency text not null default 'MVR',
  items jsonb not null default '[]',
  discount numeric not null default 0,
  svc_on boolean not null default false,
  tgst_on boolean not null default false,
  green_units numeric not null default 0,
  rates jsonb,
  notes text default '',
  status text default 'draft',
  from_quote text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (kind, yr, seq)
);
alter table public.bills drop constraint if exists bills_booking_id_fkey;

create or replace function public.bills_number() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.settings; mx int;
begin
  select * into s from public.settings where id = 1;
  if new.rates is null then
    new.rates := jsonb_build_object('service', s.service, 'tgst', s.tgst, 'green_tax', s.green_tax, 'fx', s.fx);
  end if;
  if new.no is not null then return new; end if;
  perform pg_advisory_xact_lock(hashtext('bills_' || new.kind));
  new.yr := extract(year from coalesce(new.date, current_date))::int;
  select coalesce(max(seq), 0) into mx from public.bills where kind = new.kind and yr = new.yr;
  new.seq := greatest(mx + 1, case when new.kind = 'quote' then coalesce(s.qt_next, 1) else coalesce(s.inv_next, 1) end);
  new.no := (case when new.kind = 'quote' then coalesce(s.qt_pre, 'QT') else coalesce(s.inv_pre, 'AT') end)
            || '/' || new.yr || '/' || lpad(new.seq::text, 2, '0');
  return new;
end $$;
drop trigger if exists bills_number on public.bills;
create trigger bills_number before insert on public.bills for each row execute function public.bills_number();

-- ---------- money: guest payments (with receipts), other income, expenses ----------
create table if not exists public.txns (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('in','out')),
  date date not null default current_date,
  cat text not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'MVR',
  method text default 'Cash',
  note text default '',
  bill_id uuid references public.bills on delete set null,
  booking_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.txns drop constraint if exists txns_booking_id_fkey;
alter table public.txns
  add column if not exists pay_kind text default '',
  add column if not exists payer text default '',
  add column if not exists receipt_no text,
  add column if not exists receipt_seq int,
  add column if not exists receipt_yr int;

-- every guest payment gets a receipt number: RC/2026/001 …
create or replace function public.txns_receipt() returns trigger
language plpgsql security definer set search_path = public as $$
declare s public.settings; mx int;
begin
  if new.type <> 'in' or new.receipt_no is not null or (new.bill_id is null and new.booking_id is null and coalesce(new.pay_kind, '') = '') then
    return new;
  end if;
  select * into s from public.settings where id = 1;
  perform pg_advisory_xact_lock(hashtext('receipts'));
  new.receipt_yr := extract(year from coalesce(new.date, current_date))::int;
  select coalesce(max(receipt_seq), 0) into mx from public.txns where receipt_yr = new.receipt_yr;
  new.receipt_seq := greatest(mx + 1, coalesce(s.rc_next, 1));
  new.receipt_no := coalesce(s.rc_pre, 'RC') || '/' || new.receipt_yr || '/' || lpad(new.receipt_seq::text, 3, '0');
  return new;
end $$;
drop trigger if exists txns_receipt on public.txns;
create trigger txns_receipt before insert on public.txns for each row execute function public.txns_receipt();

-- ---------- website gallery (photos & videos) ----------
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'photo' check (kind in ('photo','video')),
  url text not null,
  path text default '',
  caption text default '',
  room_id uuid references public.rooms on delete set null,
  published boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists bookings_dates on public.bookings (check_in, check_out);
create index if not exists bookings_group_idx on public.bookings (group_id);
create index if not exists txns_date on public.txns (date);
create index if not exists bills_booking on public.bills (booking_id);

-- =========================================================
-- Security: guests (not logged in) only see the public website.
-- Every admin account can do everything.
-- =========================================================
do $$
declare t text; p record;
begin
  foreach t in array array['profiles','settings','secrets','rooms','bookings','bills','txns','gallery'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

-- ---------- what the public website may read ----------
drop view if exists public.public_info;
create view public.public_info as
  select name, tagline, welcome, about, kitchen_info, house_info, address, phones, whatsapp, email, map_url, logo_url, hero_url, base, island_guide
  from public.settings where id = 1;
drop view if exists public.public_rooms;
create view public.public_rooms as
  select id, name, type, rate, max_guests, description, facilities, photo, sort from public.rooms where is_public;
drop view if exists public.public_gallery;
create view public.public_gallery as
  select id, kind, url, caption, room_id, sort, created_at from public.gallery where published;
grant select on public.public_info, public.public_rooms, public.public_gallery to anon, authenticated;

create or replace function public.available_rooms(ci date, co date)
returns table (id uuid, name text, type text, rate numeric, max_guests int, description text, photo text)
language sql stable security definer set search_path = public as $$
  select r.id, r.name, r.type, r.rate, r.max_guests, r.description, r.photo
  from public.rooms r
  where r.is_public and r.status <> 'maint' and co > ci
    and not exists (select 1 from public.bookings b
                    where b.room_id = r.id and b.status in ('booked','in')
                      and daterange(b.check_in, b.check_out) && daterange(ci, co))
  order by r.sort, r.name
$$;

drop function if exists public.request_booking(jsonb);
create function public.request_booking(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid; ci date := (p->>'check_in')::date; co date := (p->>'check_out')::date;
begin
  if coalesce(trim(p->>'guest'), '') = '' or coalesce(trim(p->>'phone'), '') = '' then
    raise exception 'Please enter your name and phone number';
  end if;
  if ci is null or co is null or co <= ci or ci < current_date then
    raise exception 'Please choose valid dates';
  end if;
  if co - ci > 60 then raise exception 'For stays over 60 nights please contact us directly'; end if;
  if (select count(*) from public.bookings
      where status = 'request' and phone = p->>'phone' and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many requests. Please call or WhatsApp us';
  end if;
  insert into public.bookings (guest, phone, email, country, check_in, check_out, adults, children, rooms_wanted, notes, status, source)
  values (left(trim(p->>'guest'), 120), left(trim(p->>'phone'), 40), left(coalesce(p->>'email', ''), 120),
          left(coalesce(p->>'country', ''), 60), ci, co,
          greatest(1, least(50, coalesce((p->>'adults')::int, 1))), greatest(0, least(50, coalesce((p->>'children')::int, 0))),
          greatest(1, least(30, coalesce((p->>'rooms')::int, 1))),
          left(coalesce(p->>'message', ''), 1000), 'request', 'Website')
  returning id into rid;
  return rid;
end $$;

revoke all on function public.available_rooms(date, date) from public;
revoke all on function public.request_booking(jsonb) from public;
grant execute on function public.available_rooms(date, date) to anon, authenticated;
grant execute on function public.request_booking(jsonb) to anon, authenticated;
grant execute on function public.is_staff(), public.is_admin() to authenticated;

-- ---------- storage for photos & videos ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists media_staff_insert on storage.objects;
create policy media_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
drop policy if exists media_staff_update on storage.objects;
create policy media_staff_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_staff());
drop policy if exists media_staff_delete on storage.objects;
create policy media_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_staff());

-- your signature from the sample invoice (change it any time in Settings)
update public.secrets set signature = 'data:image/png;base64,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' where coalesce(signature, '') = '';
