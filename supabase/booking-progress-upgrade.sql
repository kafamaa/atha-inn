-- ATHA INN guest booking progress and optional staff WhatsApp alert log.
-- Run once in the ATHA INN Supabase SQL Editor, after backing up the database.
-- Existing reservations, billing and staff policies are unchanged.

create or replace function public.track_booking(booking_id uuid, guest_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if booking_id is null or length(regexp_replace(coalesce(guest_phone, ''), '[^0-9]', '', 'g')) < 7 then
    return null;
  end if;

  select jsonb_build_object('status', b.status)
  into result
  from public.bookings b
  where b.id = booking_id
    and right(regexp_replace(coalesce(b.phone, ''), '[^0-9]', '', 'g'), 7)
      = right(regexp_replace(guest_phone, '[^0-9]', '', 'g'), 7)
  limit 1;

  return result;
end;
$$;

revoke all on function public.track_booking(uuid, text) from public;
grant execute on function public.track_booking(uuid, text) to anon, authenticated;

-- Idempotency record for externally configured notifications.
-- Only the backend service role may manage this table.
create table if not exists public.booking_alert_log (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  delivery_status text not null default 'attempted'
);
alter table public.booking_alert_log enable row level security;
revoke all on public.booking_alert_log from anon, authenticated;
