begin;
create table public.cash_points (
  id uuid primary key default gen_random_uuid(),name text not null check(length(name) between 1 and 150),
  district text not null,address text not null,hours text not null default '',phone text not null default '',
  latitude numeric(9,6) not null check(latitude between -90 and 90),
  longitude numeric(9,6) not null check(longitude between -180 and 180),
  is_active boolean not null default false,is_demo boolean not null default true,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  check(not is_active or not is_demo)
);
alter table public.cash_points enable row level security;
revoke all on public.cash_points from anon,authenticated;
grant select on public.cash_points to anon,authenticated;
grant insert,update,delete on public.cash_points to authenticated;
create policy points_read on public.cash_points for select to anon,authenticated using(true);
create policy points_admin on public.cash_points for all to authenticated using(public.is_admin()) with check(public.is_admin());
create trigger touch_updated_at before update on public.cash_points for each row execute function public.touch_updated_at();

-- Thirty fictional, unverified placeholders. These are NOT operating cash desks.
-- Approximate map positions are illustrative; administrators must enter verified addresses.
insert into public.cash_points(name,district,address,hours,latitude,longitude)
select 'Namuna punkt '||lpad(n::text,2,'0'),
  (array['Chilonzor','Yunusobod','Mirzo Ulug‘bek','Yakkasaroy','Mirobod','Shayxontohur','Olmazor','Uchtepa','Yashnobod','Sergeli','Yangihayot','Bektemir'])[((n-1)%12)+1],
  'Aniq manzil administrator tomonidan tasdiqlanmagan','Ish vaqti tasdiqlanmagan',
  41.255+floor((n-1)/6.0)*0.025,69.175+((n-1)%6)*0.035
from generate_series(1,30) n;

create table public.payment_settings (
  id int primary key default 1 check(id=1),recipient_name text not null default '',
  recipient_card text not null default '' check(recipient_card='' or recipient_card ~ '^[0-9]{16}$'),
  bank_name text not null default '',instructions text not null default '',enabled boolean not null default false,
  updated_at timestamptz not null default now(),check(not enabled or (recipient_card<>'' and recipient_name<>''))
);
insert into public.payment_settings(id) values(1);
alter table public.payment_settings enable row level security;
revoke all on public.payment_settings from anon,authenticated;
grant select on public.payment_settings to anon,authenticated;
grant update on public.payment_settings to authenticated;
create policy settings_read on public.payment_settings for select to anon,authenticated using(enabled or public.is_admin());
create policy settings_admin on public.payment_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
create trigger touch_updated_at before update on public.payment_settings for each row execute function public.touch_updated_at();

alter table public.bookings add column payment_method text not null default 'cash' check(payment_method in ('cash','card'));
alter table public.bookings add column pickup_point_id uuid references public.cash_points(id) on delete restrict;

create function public.reserve_checkout(p_event_id uuid,p_seat_ids uuid[],p_payment_method text,p_pickup_point_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_result jsonb;v_id uuid;v_expires timestamptz;v_demo boolean;v_point public.cash_points;
begin
  if auth.uid() is null then raise exception 'Avval hisobingizga kiring.';end if;
  if p_payment_method is null or p_payment_method not in ('cash','card') then raise exception 'To‘lov usulini tanlang.';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text,0));
  select is_demo into v_demo from public.events where id=p_event_id;
  if p_payment_method='cash' then
    select * into v_point from public.cash_points where id=p_pickup_point_id for share;
    if not found or not (v_point.is_active or (v_demo and v_point.is_demo)) then raise exception 'Faol to‘lov punktini tanlang.';end if;
  elsif not exists(select 1 from public.payment_settings where id=1 and enabled) then
    raise exception 'Karta to‘lovi hali sozlanmagan.';
  end if;
  v_result:=public.reserve_seats(p_event_id,p_seat_ids);v_id:=(v_result->>'id')::uuid;
  v_expires:=clock_timestamp()+case when p_payment_method='cash' then interval '1 hour' else interval '10 minutes' end;
  update public.bookings set payment_method=p_payment_method,pickup_point_id=case when p_payment_method='cash' then p_pickup_point_id else null end,expires_at=v_expires where id=v_id;
  return v_result||jsonb_build_object('expires_at',v_expires,'payment_method',p_payment_method,'pickup_point_id',case when p_payment_method='cash' then p_pickup_point_id else null end);
end $$;
revoke all on function public.reserve_checkout(uuid,uuid[],text,uuid) from public,anon,authenticated;
grant execute on function public.reserve_checkout(uuid,uuid[],text,uuid) to authenticated;
commit;

begin;
alter table public.payments drop constraint payments_method_check;
alter table public.payments add constraint payments_method_check check(method in ('cash','demo_card','card_manual'));
alter table public.payments drop constraint payments_status_check;
alter table public.payments add constraint payments_status_check check(status in ('pending','review','paid','cancelled','expired','rejected'));
alter table public.payments add column receipt_path text;
alter table public.payments add column card_last4 text check(card_last4 is null or card_last4 ~ '^[0-9]{4}$');
alter table public.payments add column submitted_at timestamptz;
alter table public.payments add column review_note text;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-receipts','payment-receipts',false,5242880,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
create policy receipt_upload on storage.objects for insert to authenticated with check(
  bucket_id='payment-receipts' and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.bookings b where b.id::text=(storage.foldername(name))[2] and b.user_id=auth.uid() and b.status='pending' and b.payment_method='card' and b.expires_at>clock_timestamp())
);
create policy receipt_read on storage.objects for select to authenticated using(
  bucket_id='payment-receipts' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin())
);

create or replace function public.expire_event_reservations(p_event_id uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[];v_count int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text,0));
  select array_agg(id) into v_ids from public.bookings where event_id=p_event_id and status='pending' and expires_at<=clock_timestamp();
  if v_ids is null then return 0;end if;
  update public.bookings set status='expired' where id=any(v_ids) and status='pending';get diagnostics v_count=row_count;
  update public.booking_seats set released_at=clock_timestamp() where booking_id=any(v_ids) and released_at is null;
  update public.payments set status='expired' where booking_id=any(v_ids) and status in ('pending','review');
  return v_count;
end $$;

create function public.submit_card_receipt(p_booking_id uuid,p_receipt_path text,p_card_last4 text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_event uuid;v_booking public.bookings;v_payment public.payments;v_expires timestamptz;
begin
  select event_id into v_event from public.bookings where id=p_booking_id and user_id=auth.uid();
  if not found then raise exception 'Buyurtma topilmadi.';end if;
  perform pg_advisory_xact_lock(hashtextextended(v_event::text,0));
  perform public.expire_event_reservations(v_event);
  select * into v_booking from public.bookings where id=p_booking_id for update;
  select * into v_payment from public.payments where booking_id=p_booking_id for update;
  if v_payment.status='review' then return jsonb_build_object('status','review','expires_at',v_booking.expires_at);end if;
  if v_booking.status<>'pending' or v_booking.expires_at<=clock_timestamp() then return jsonb_build_object('status',v_booking.status,'error','Band qilish muddati tugagan.');end if;
  if v_booking.payment_method<>'card' then raise exception 'Bu buyurtma uchun karta usuli tanlanmagan.';end if;
  if split_part(p_receipt_path,'/',1)<>auth.uid()::text or split_part(p_receipt_path,'/',2)<>p_booking_id::text
    or not exists(select 1 from storage.objects where bucket_id='payment-receipts' and name=p_receipt_path)
  then raise exception 'Yuklangan chek topilmadi.';end if;
  if p_card_last4 is not null and p_card_last4 !~ '^[0-9]{4}$' then raise exception 'Kartadan faqat oxirgi 4 raqamni kiriting.';end if;
  v_expires:=clock_timestamp()+interval '24 hours';
  update public.payments set method='card_manual',status='review',receipt_path=p_receipt_path,card_last4=p_card_last4,submitted_at=clock_timestamp() where booking_id=p_booking_id;
  update public.bookings set expires_at=v_expires where id=p_booking_id;
  return jsonb_build_object('status','review','expires_at',v_expires);
end $$;

create function public.review_card_payment(p_booking_id uuid,p_approve boolean,p_note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_event uuid;v_booking public.bookings;v_payment public.payments;
begin
  if not public.is_admin() then raise exception 'Admin ruxsati kerak.';end if;
  if p_approve is null then raise exception 'Qarorni tanlang.';end if;
  select event_id into v_event from public.bookings where id=p_booking_id;
  if not found then raise exception 'Buyurtma topilmadi.';end if;
  perform pg_advisory_xact_lock(hashtextextended(v_event::text,0));
  perform public.expire_event_reservations(v_event);
  select * into v_booking from public.bookings where id=p_booking_id for update;
  select * into v_payment from public.payments where booking_id=p_booking_id for update;
  if v_booking.status='paid' then return jsonb_build_object('status','paid','already_confirmed',true);end if;
  if v_booking.status<>'pending' or v_booking.expires_at<=clock_timestamp() then return jsonb_build_object('status',v_booking.status,'error','Tasdiqlash muddati tugagan. Pulni qaytarish masalasini tekshiring.');end if;
  if v_booking.payment_method<>'card' or v_payment.status<>'review' or v_payment.receipt_path is null then raise exception 'Tekshirish uchun chek yuborilmagan.';end if;
  if p_approve then
    if not exists(select 1 from public.events where id=v_event and status='published' and starts_at>clock_timestamp()) then raise exception 'Tadbir to‘lov uchun ochiq emas.';end if;
    if exists(select 1 from public.booking_seats where booking_id=p_booking_id and released_at is not null) then raise exception 'Joy bandi yaroqsiz.';end if;
    update public.bookings set status='paid' where id=p_booking_id;
    update public.payments set status='paid',confirmed_at=clock_timestamp(),confirmed_by=auth.uid(),review_note=left(p_note,1000) where booking_id=p_booking_id;
    insert into public.tickets(booking_id,booking_seat_id) select p_booking_id,id from public.booking_seats where booking_id=p_booking_id;
    return jsonb_build_object('status','paid');
  else
    update public.bookings set status='cancelled' where id=p_booking_id;
    update public.payments set status='rejected',confirmed_at=clock_timestamp(),confirmed_by=auth.uid(),review_note=left(p_note,1000) where booking_id=p_booking_id;
    update public.booking_seats set released_at=clock_timestamp() where booking_id=p_booking_id and released_at is null;
    return jsonb_build_object('status','rejected');
  end if;
end $$;
revoke all on function public.submit_card_receipt(uuid,text,text),public.review_card_payment(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.submit_card_receipt(uuid,text,text),public.review_card_payment(uuid,boolean,text) to authenticated;
-- The former fictional-card endpoint is retired for new checkouts.
revoke execute on function public.pay_demo_card(uuid,text) from authenticated;
create or replace function public.confirm_cash_payment(p_booking_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings;v_event uuid;
begin
  if not public.is_admin() then raise exception 'Admin ruxsati kerak.';end if;
  select event_id into v_event from public.bookings where id=p_booking_id;
  if not found then raise exception 'Buyurtma topilmadi.';end if;
  perform pg_advisory_xact_lock(hashtextextended(v_event::text,0));
  perform public.expire_event_reservations(v_event);
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if v_booking.payment_method<>'cash' then raise exception 'Karta cheki uchun chekni tekshirish amalidan foydalaning.';end if;
  if v_booking.status='paid' then return jsonb_build_object('status','paid','already_confirmed',true);end if;
  if v_booking.status<>'pending' or v_booking.expires_at<=clock_timestamp() then return jsonb_build_object('status',v_booking.status,'error','Band qilish muddati tugagan.');end if;
  if not exists(select 1 from public.events where id=v_event and status='published' and starts_at>clock_timestamp()) then raise exception 'Tadbir to‘lov uchun ochiq emas.';end if;
  if not exists(select 1 from public.booking_seats where booking_id=p_booking_id) or exists(select 1 from public.booking_seats where booking_id=p_booking_id and released_at is not null) then raise exception 'Joy bandi yaroqsiz.';end if;
  update public.bookings set status='paid' where id=p_booking_id;
  update public.payments set status='paid',method='cash',confirmed_at=clock_timestamp(),confirmed_by=auth.uid() where booking_id=p_booking_id;
  insert into public.tickets(booking_id,booking_seat_id) select p_booking_id,id from public.booking_seats where booking_id=p_booking_id;
  return jsonb_build_object('status','paid');
end $$;

create or replace function public.cancel_booking(p_booking_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings;v_event uuid;
begin
  select event_id into v_event from public.bookings where id=p_booking_id and (user_id=auth.uid() or public.is_admin());
  if not found then raise exception 'Buyurtma topilmadi.';end if;
  perform pg_advisory_xact_lock(hashtextextended(v_event::text,0));
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if v_booking.status<>'pending' then raise exception 'Faqat to‘lanmagan bandni bekor qilish mumkin.';end if;
  if exists(select 1 from public.payments where booking_id=p_booking_id and status='review') then raise exception 'Chek tekshirilmoqda. Admin tasdiqlashi yoki rad etishi kerak.';end if;
  update public.bookings set status='cancelled' where id=p_booking_id;
  update public.booking_seats set released_at=clock_timestamp() where booking_id=p_booking_id and released_at is null;
  update public.payments set status='cancelled' where booking_id=p_booking_id;
  return jsonb_build_object('status','cancelled');
end $$;

create or replace function public.admin_stats() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin ruxsati kerak.';end if;
  return jsonb_build_object('events',(select count(*) from public.events),'bookings',(select count(*) from public.bookings),
    'sold',(select count(*) from public.tickets),
    'available',(select count(*) from public.seats s where not exists(select 1 from public.booking_seats bs join public.bookings b on b.id=bs.booking_id where bs.seat_id=s.id and bs.released_at is null and (b.status='paid' or (b.status='pending' and b.expires_at>clock_timestamp())))),
    'pending',(select count(*) from public.bookings where status='pending' and expires_at>clock_timestamp()),
    'revenue',(select coalesce(sum(amount),0) from public.payments where status='paid' and method in ('cash','card_manual')),
    'review',(select count(*) from public.payments where status='review'));
end $$;
commit;
