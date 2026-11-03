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
