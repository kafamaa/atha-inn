-- =========================================================
-- ATHA INN — database (run once in Supabase → SQL Editor)
-- =========================================================
create extension if not exists btree_gist;

-- ---------- staff accounts ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  email text,
  role text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- The very first account created becomes the owner (admin).
-- Later accounts get no access until the owner adds them from Settings → Staff.
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

-- ---------- business settings ----------
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  name text not null default 'Atha Inn',
  tagline text default 'A calm island guesthouse in Kanditheemu',
  about text default 'Clean, comfortable rooms a short walk from the beach. Friendly local hosts, airport and ferry transfer help, and excursions around Shaviyani Atoll.',
  address text default 'ATHA / SH.KANDITHEEMU, Maldives',
  phones text default '7587079, 9111241',
  whatsapp text default '9607587079',
  email text default '',
  tin text default '',
  map_url text default '',
  logo_url text default '',
  hero_url text default '',
  base text not null default 'MVR',
  fx numeric not null default 15.42,
  tgst numeric not null default 17,
  service numeric not null default 10,
  green_tax numeric not null default 6,
  bank text default E'Account name: Ahmedh Nazeem\nAccount number: 7704260704101\nBank: Bank of Maldives',
  footer_q text default 'Please confirm this quotation to reserve the rooms. Thank you.',
  footer_i text default 'Thank you for staying with us.',
  inv_pre text default 'AT',
  inv_next int default 3,
  qt_pre text default 'QT',
  qt_next int default 1,
  sig_on boolean default true,
  updated_at timestamptz default now()
);
insert into public.settings (id) values (1) on conflict do nothing;

-- signature is private (staff only)
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
  status text not null default 'ready' check (status in ('ready','cleaning','maint')),
  description text default '',
  photo text default '',
  notes text default '',
  is_public boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- bookings ----------
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
  status text not null default 'booked' check (status in ('booked','in','out','cancel')),
  source text default 'Walk-in',
  notes text default '',
  request_id uuid,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint dates_ok check (check_out > check_in),
  constraint bookings_no_overlap exclude using gist (
    room_id with =, daterange(check_in, check_out) with &&
  ) where (status in ('booked','in'))
);

-- ---------- online booking requests (from the public website) ----------
create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  guest text not null,
  phone text not null,
  email text default '',
  country text default '',
  room_id uuid references public.rooms on delete set null,
  check_in date not null,
  check_out date not null,
  adults int not null default 1,
  children int not null default 0,
  message text default '',
  status text not null default 'new' check (status in ('new','accepted','declined')),
  booking_id uuid references public.bookings on delete set null,
  created_at timestamptz not null default now()
);

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
  booking_id uuid references public.bookings on delete set null,
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

-- numbers bills automatically: AT/2026/03, QT/2026/01 …
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
create trigger bills_number before insert on public.bills
  for each row execute function public.bills_number();

-- ---------- money: income, expenses, payments ----------
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
  booking_id uuid references public.bookings on delete set null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists bookings_dates on public.bookings (check_in, check_out);
create index if not exists txns_date on public.txns (date);
create index if not exists bills_booking on public.bills (booking_id);

-- =========================================================
-- Security (Row Level Security)
--   public website : can only see public_info, public_rooms and send requests
--   staff          : front desk (bookings, rooms, bills, payments)
--   admin (owner)  : everything, incl. income/expenses, settings, staff
-- =========================================================
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.secrets enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_requests enable row level security;
alter table public.bills enable row level security;
alter table public.txns enable row level security;

drop policy if exists p_profiles_read on public.profiles;
create policy p_profiles_read on public.profiles for select to authenticated using (public.is_staff());
drop policy if exists p_profiles_admin on public.profiles;
create policy p_profiles_admin on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_settings_read on public.settings;
create policy p_settings_read on public.settings for select to authenticated using (public.is_staff());
drop policy if exists p_settings_write on public.settings;
create policy p_settings_write on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_secrets_read on public.secrets;
create policy p_secrets_read on public.secrets for select to authenticated using (public.is_staff());
drop policy if exists p_secrets_write on public.secrets;
create policy p_secrets_write on public.secrets for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists p_rooms_read on public.rooms;
create policy p_rooms_read on public.rooms for select to authenticated using (public.is_staff());
drop policy if exists p_rooms_update on public.rooms;
create policy p_rooms_update on public.rooms for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists p_rooms_insert on public.rooms;
create policy p_rooms_insert on public.rooms for insert to authenticated with check (public.is_admin());
drop policy if exists p_rooms_delete on public.rooms;
create policy p_rooms_delete on public.rooms for delete to authenticated using (public.is_admin());

drop policy if exists p_bookings_rw on public.bookings;
create policy p_bookings_rw on public.bookings for select to authenticated using (public.is_staff());
drop policy if exists p_bookings_ins on public.bookings;
create policy p_bookings_ins on public.bookings for insert to authenticated with check (public.is_staff());
drop policy if exists p_bookings_upd on public.bookings;
create policy p_bookings_upd on public.bookings for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists p_bookings_del on public.bookings;
create policy p_bookings_del on public.bookings for delete to authenticated using (public.is_admin());

drop policy if exists p_req_read on public.booking_requests;
create policy p_req_read on public.booking_requests for select to authenticated using (public.is_staff());
drop policy if exists p_req_upd on public.booking_requests;
create policy p_req_upd on public.booking_requests for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists p_req_del on public.booking_requests;
create policy p_req_del on public.booking_requests for delete to authenticated using (public.is_admin());

drop policy if exists p_bills_read on public.bills;
create policy p_bills_read on public.bills for select to authenticated using (public.is_staff());
drop policy if exists p_bills_ins on public.bills;
create policy p_bills_ins on public.bills for insert to authenticated with check (public.is_staff());
drop policy if exists p_bills_upd on public.bills;
create policy p_bills_upd on public.bills for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists p_bills_del on public.bills;
create policy p_bills_del on public.bills for delete to authenticated using (public.is_admin());

-- front desk sees and records only guest payments; the owner sees all money
drop policy if exists p_txns_read on public.txns;
create policy p_txns_read on public.txns for select to authenticated using (
  public.is_admin() or (public.is_staff() and type = 'in' and (bill_id is not null or booking_id is not null)));
drop policy if exists p_txns_ins on public.txns;
create policy p_txns_ins on public.txns for insert to authenticated with check (
  public.is_admin() or (public.is_staff() and type = 'in' and (bill_id is not null or booking_id is not null)));
drop policy if exists p_txns_upd on public.txns;
create policy p_txns_upd on public.txns for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists p_txns_del on public.txns;
create policy p_txns_del on public.txns for delete to authenticated using (public.is_admin());

-- ---------- what the public website may read ----------
create or replace view public.public_info as
  select name, tagline, about, address, phones, whatsapp, email, map_url, logo_url, hero_url, base from public.settings where id = 1;
create or replace view public.public_rooms as
  select id, name, type, rate, max_guests, description, photo, sort from public.rooms where is_public;
grant select on public.public_info, public.public_rooms to anon, authenticated;

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

create or replace function public.request_booking(p jsonb) returns uuid
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
  if (select count(*) from public.booking_requests
      where phone = p->>'phone' and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many requests. Please call or WhatsApp us';
  end if;
  insert into public.booking_requests (guest, phone, email, country, room_id, check_in, check_out, adults, children, message)
  values (left(trim(p->>'guest'), 120), left(trim(p->>'phone'), 40), left(coalesce(p->>'email', ''), 120),
          left(coalesce(p->>'country', ''), 60), nullif(p->>'room_id', '')::uuid, ci, co,
          greatest(1, least(20, coalesce((p->>'adults')::int, 1))), greatest(0, least(20, coalesce((p->>'children')::int, 0))),
          left(coalesce(p->>'message', ''), 1000))
  returning id into rid;
  return rid;
end $$;

revoke all on function public.available_rooms(date, date) from public;
revoke all on function public.request_booking(jsonb) from public;
grant execute on function public.available_rooms(date, date) to anon, authenticated;
grant execute on function public.request_booking(jsonb) to anon, authenticated;
grant execute on function public.is_staff(), public.is_admin() to authenticated;

-- ---------- photo storage (room photos, logo, cover picture) ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict (id) do nothing;
drop policy if exists media_staff_insert on storage.objects;
create policy media_staff_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
drop policy if exists media_staff_update on storage.objects;
create policy media_staff_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_staff());
drop policy if exists media_staff_delete on storage.objects;
create policy media_staff_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_admin());

-- your signature from the sample invoice (change it any time in Settings)
update public.secrets set signature = 'data:image/png;base64,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' where coalesce(signature, '') = '';
