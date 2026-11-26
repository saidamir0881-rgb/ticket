-- Temporary live payment test: price all Shohruhxon seats at 1,000 UZS.
-- Original event and seat prices are saved so restore-hamyon-test-price.sql can revert them.
begin;
create table if not exists public.hamyon_test_price_event_backup(
  event_id uuid primary key,min_price numeric(12,0) not null,max_price numeric(12,0) not null,saved_at timestamptz not null default now()
);
create table if not exists public.hamyon_test_price_seat_backup(
  seat_id uuid primary key,event_id uuid not null,price numeric(12,0) not null
);
do $$
declare v_event uuid:='30000000-0000-4000-8000-000000006394';v_seats int;
begin
  if not exists(select 1 from public.events where id=v_event and title='Shohruhxon' and status='published' and starts_at>clock_timestamp() and inventory_mode='local') then
    raise exception 'Test event Shohruhxon is missing, not published, or has no local seat inventory.';
  end if;
  if exists(select 1 from public.bookings where event_id=v_event and status='pending' and expires_at>clock_timestamp()) then
    raise exception 'There are active reservations for Shohruhxon; wait until they finish before changing its test price.';
  end if;
  if exists(select 1 from public.hamyon_test_price_event_backup where event_id=v_event) then
    raise exception 'A temporary price test is already active. Restore it before running this script again.';
  end if;
  insert into public.hamyon_test_price_event_backup(event_id,min_price,max_price)
    select id,min_price,max_price from public.events where id=v_event;
  insert into public.hamyon_test_price_seat_backup(seat_id,event_id,price)
    select id,event_id,price from public.seats where event_id=v_event;
  get diagnostics v_seats=row_count;
  if v_seats=0 then raise exception 'Shohruhxon has no local seats.';end if;
  update public.seats set price=1000 where event_id=v_event;
  update public.events set min_price=1000,max_price=1000 where id=v_event;
end $$;
commit;
