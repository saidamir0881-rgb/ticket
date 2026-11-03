-- Demo/test payments only. No payment gateway, real card or real money.
begin;
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check(method in ('cash','demo_card'));

create function public.pay_demo_card(p_booking_id uuid,p_test_card text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_event uuid; v_booking public.bookings; v_demo boolean; v_status text;
begin
  if auth.uid() is null then raise exception 'Avval hisobingizga kiring.'; end if;
  if p_test_card is null or p_test_card not in ('success','declined') then
    raise exception 'Faqat namuna test kartalari qabul qilinadi.';
  end if;
  select event_id into v_event from public.bookings where id=p_booking_id and user_id=auth.uid();
  if not found then raise exception 'Buyurtma topilmadi.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_event::text,0));
  select is_demo,status into v_demo,v_status from public.events where id=v_event for update;
  if not coalesce(v_demo,false) then raise exception 'Test to‘lov faqat DEMO tadbirlarda ishlaydi.'; end if;
  if v_status<>'published' or not exists(select 1 from public.events where id=v_event and starts_at>clock_timestamp()) then
    raise exception 'Tadbir to‘lov uchun ochiq emas.';
  end if;
  perform public.expire_event_reservations(v_event);
  select * into v_booking from public.bookings where id=p_booking_id and user_id=auth.uid() for update;
  if v_booking.status='paid' then return jsonb_build_object('status','paid','already_confirmed',true); end if;
  if v_booking.status<>'pending' or v_booking.expires_at<=clock_timestamp() then
    return jsonb_build_object('status',v_booking.status,'error','Band qilish muddati tugagan yoki buyurtma bekor qilingan.');
  end if;
  if p_test_card='declined' then return jsonb_build_object('status','declined','error','Test karta rad etildi. Muvaffaqiyatli test kartasini tanlang.'); end if;
  if not exists(select 1 from public.booking_seats where booking_id=p_booking_id)
    or exists(select 1 from public.booking_seats where booking_id=p_booking_id and released_at is not null)
  then raise exception 'Joy bandi yaroqsiz.'; end if;
  update public.bookings set status='paid' where id=p_booking_id;
  update public.payments set status='paid',method='demo_card',confirmed_at=clock_timestamp(),confirmed_by=null
    where booking_id=p_booking_id;
  insert into public.tickets(booking_id,booking_seat_id)
    select p_booking_id,id from public.booking_seats where booking_id=p_booking_id;
  return jsonb_build_object('status','paid','method','demo_card');
end $$;
revoke all on function public.pay_demo_card(uuid,text) from public,anon,authenticated;
grant execute on function public.pay_demo_card(uuid,text) to authenticated;

-- Fake demo payments must never count as cash revenue.
create or replace function public.admin_stats() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin ruxsati kerak.'; end if;
  return jsonb_build_object(
    'events',(select count(*) from public.events),
    'bookings',(select count(*) from public.bookings),
    'sold',(select count(*) from public.tickets),
    'available',(select count(*) from public.seats s where not exists(
      select 1 from public.booking_seats bs join public.bookings b on b.id=bs.booking_id
      where bs.seat_id=s.id and bs.released_at is null and
      (b.status='paid' or (b.status='pending' and b.expires_at>clock_timestamp())))),
    'pending',(select count(*) from public.bookings where status='pending' and expires_at>clock_timestamp()),
    'revenue',(select coalesce(sum(amount),0) from public.payments where status='paid' and method='cash'),
    'demo_total',(select coalesce(sum(amount),0) from public.payments where status='paid' and method='demo_card')
  );
end $$;
revoke all on function public.admin_stats() from public,anon;
grant execute on function public.admin_stats() to authenticated;
commit;
