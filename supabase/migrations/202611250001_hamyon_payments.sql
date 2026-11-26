begin;
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check check(method in ('cash','demo_card','card_manual','hamyon'));
alter table public.payments add column if not exists hamyon_payment_id text unique;
alter table public.payments add column if not exists hamyon_amount numeric(12,0) check(hamyon_amount is null or hamyon_amount>0);
alter table public.payments add column if not exists hamyon_card text;

create or replace function public.complete_hamyon_payment(p_payment_id text,p_amount numeric,p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_payment public.payments;v_booking public.bookings;v_event uuid;
begin
  if p_status not in ('paid','cancel') then raise exception 'Invalid Hamyon status.';end if;
  select * into v_payment from public.payments where hamyon_payment_id=p_payment_id;
  if not found then raise exception 'Payment not found.';end if;
  select * into v_booking from public.bookings where id=v_payment.booking_id;
  v_event:=v_booking.event_id;
  perform pg_advisory_xact_lock(hashtextextended(v_event::text,0));
  select * into v_payment from public.payments where id=v_payment.id for update;
  select * into v_booking from public.bookings where id=v_booking.id for update;
  if v_payment.hamyon_amount<>p_amount then raise exception 'Payment amount mismatch.';end if;
  if v_booking.status='paid' then return jsonb_build_object('status','paid','already_confirmed',true);end if;
  if v_booking.status<>'pending' then return jsonb_build_object('status',v_booking.status);end if;
  if p_status='cancel' then
    update public.bookings set status='expired' where id=v_booking.id;
    update public.booking_seats set released_at=clock_timestamp() where booking_id=v_booking.id and released_at is null;
    update public.payments set status='expired' where id=v_payment.id and status='pending';
    return jsonb_build_object('status','expired');
  end if;
  if v_booking.expires_at<=clock_timestamp() or not exists(select 1 from public.events where id=v_event and status='published' and starts_at>clock_timestamp()) then
    update public.bookings set status='expired' where id=v_booking.id;
    update public.booking_seats set released_at=clock_timestamp() where booking_id=v_booking.id and released_at is null;
    update public.payments set status='expired' where id=v_payment.id and status='pending';
    return jsonb_build_object('status','expired');
  end if;
  if exists(select 1 from public.booking_seats where booking_id=v_booking.id and released_at is not null) then raise exception 'Reserved seats are no longer valid.';end if;
  update public.bookings set status='paid' where id=v_booking.id;
  update public.payments set status='paid',confirmed_at=clock_timestamp() where id=v_payment.id;
  insert into public.tickets(booking_id,booking_seat_id) select v_booking.id,id from public.booking_seats where booking_id=v_booking.id on conflict(booking_seat_id) do nothing;
  return jsonb_build_object('status','paid');
end $$;
revoke all on function public.complete_hamyon_payment(text,numeric,text) from public,anon,authenticated;
grant execute on function public.complete_hamyon_payment(text,numeric,text) to service_role;
commit;
