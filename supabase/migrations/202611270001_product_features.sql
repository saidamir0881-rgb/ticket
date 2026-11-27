begin;

-- Account features: favorites, Telegram event reminders, referrals, promo codes,
-- refund requests, and an organization-scoped organizer role.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(role in ('customer','admin','organizer'));
alter table public.events add column if not exists organization_id uuid;

create table public.favorite_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  notify boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(user_id,event_id)
);
alter table public.favorite_events enable row level security;
revoke all on public.favorite_events from anon,authenticated;
grant select,insert,update,delete on public.favorite_events to authenticated;
create policy favorite_events_owner on public.favorite_events for all to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());

create table public.event_reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  unique(booking_id,scheduled_for)
);
create index event_reminders_pending on public.event_reminders(scheduled_for) where sent_at is null;
alter table public.event_reminders enable row level security;
revoke all on public.event_reminders from anon,authenticated;
grant select on public.event_reminders to authenticated;
create policy event_reminders_owner_read on public.event_reminders for select to authenticated using(user_id=auth.uid());

create table public.favorite_event_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_id uuid not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  unique(user_id,event_id),
  foreign key(user_id,event_id) references public.favorite_events(user_id,event_id) on delete cascade
);
create index favorite_event_reminders_pending on public.favorite_event_reminders(scheduled_for) where sent_at is null;
alter table public.favorite_event_reminders enable row level security;
revoke all on public.favorite_event_reminders from anon,authenticated;
grant select,delete on public.favorite_event_reminders to authenticated;
create policy favorite_reminders_owner_read on public.favorite_event_reminders for select to authenticated using(user_id=auth.uid());
create policy favorite_reminders_owner_delete on public.favorite_event_reminders for delete to authenticated using(user_id=auth.uid());

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check(code=upper(code) and length(code) between 3 and 24),
  discount_type text not null check(discount_type in ('percent','fixed')),
  discount_value numeric(12,0) not null check(discount_value>0),
  max_uses integer check(max_uses is null or max_uses>0),
  uses integer not null default 0 check(uses>=0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check(discount_type<>'percent' or discount_value<=90)
);
create table public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  discount numeric(12,0) not null check(discount>=0),
  created_at timestamptz not null default now(),
  unique(promo_code_id,user_id)
);
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
revoke all on public.promo_codes,public.promo_redemptions from anon,authenticated;
grant select on public.promo_codes to authenticated;
grant select on public.promo_redemptions to authenticated;
create policy promo_codes_read on public.promo_codes for select to authenticated using(active and (expires_at is null or expires_at>now()));
grant insert,update,delete on public.promo_codes to authenticated;
create policy promo_codes_admin_manage on public.promo_codes for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy promo_redemptions_owner on public.promo_redemptions for select to authenticated using(user_id=auth.uid());

create table public.referrals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique check(code=upper(code) and length(code) between 6 and 16),
  referred_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check(referred_by is null or referred_by<>user_id)
);
alter table public.referrals enable row level security;
revoke all on public.referrals from anon,authenticated;
grant select on public.referrals to authenticated;
create policy referrals_owner on public.referrals for select to authenticated using(user_id=auth.uid());

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id),
  user_id uuid not null references public.profiles(id),
  reason text not null check(length(reason) between 5 and 1000),
  status text not null default 'pending' check(status in ('pending','approved','rejected','refunded')),
  admin_note text not null default '',
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id)
);
alter table public.refund_requests enable row level security;
revoke all on public.refund_requests from anon,authenticated;
grant select on public.refund_requests to authenticated;
create policy refund_requests_owner_read on public.refund_requests for select to authenticated using(user_id=auth.uid() or public.is_admin());
grant update(status,admin_note,resolved_at,resolved_by) on public.refund_requests to authenticated;
create policy refund_requests_admin_update on public.refund_requests for update to authenticated using(public.is_admin()) with check(public.is_admin());

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 2 and 150),
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.events add constraint events_organization_id_fkey foreign key(organization_id) references public.organizations(id) on delete set null;
create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'manager' check(role in ('owner','manager','viewer')),
  created_at timestamptz not null default now(),
  primary key(organization_id,user_id)
);
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
revoke all on public.organizations,public.organization_members from anon,authenticated;
grant select on public.organizations,public.organization_members to authenticated;
create policy organizations_member_read on public.organizations for select to authenticated
  using(public.is_admin() or exists(select 1 from public.organization_members m where m.organization_id=id and m.user_id=auth.uid()));
create policy organization_members_self_read on public.organization_members for select to authenticated
  using(user_id=auth.uid() or public.is_admin());
create policy events_organizer_read on public.events for select to authenticated
  using(exists(select 1 from public.organization_members m where m.organization_id=events.organization_id and m.user_id=auth.uid()));
create policy bookings_organizer_read on public.bookings for select to authenticated
  using(exists(select 1 from public.events e join public.organization_members m on m.organization_id=e.organization_id where e.id=event_id and m.user_id=auth.uid()));
create policy booking_seats_organizer_read on public.booking_seats for select to authenticated
  using(exists(select 1 from public.events e join public.organization_members m on m.organization_id=e.organization_id where e.id=event_id and m.user_id=auth.uid()));

create or replace function public.apply_booking_promo(p_booking_id uuid,p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_booking public.bookings;v_code public.promo_codes;v_discount numeric(12,0);
begin
  if v_user is null then raise exception 'Avval hisobingizga kiring.';end if;
  select * into v_booking from public.bookings where id=p_booking_id and user_id=v_user for update;
  if not found or v_booking.status<>'pending' then raise exception 'Faol bron topilmadi.';end if;
  select * into v_code from public.promo_codes where code=upper(trim(p_code)) and active and starts_at<=now() and (expires_at is null or expires_at>now()) for update;
  if not found then raise exception 'Promokod yaroqsiz yoki muddati tugagan.';end if;
  if v_code.max_uses is not null and v_code.uses>=v_code.max_uses then raise exception 'Promokod ishlatish limiti tugagan.';end if;
  if exists(select 1 from public.promo_redemptions where promo_code_id=v_code.id and user_id=v_user) then raise exception 'Bu promokoddan avval foydalangansiz.';end if;
  v_discount:=case when v_code.discount_type='percent' then floor(v_booking.total*v_code.discount_value/100) else least(v_booking.total,v_code.discount_value) end;
  if v_discount<=0 then raise exception 'Promokod chegirmasi qo‘llanmadi.';end if;
  update public.bookings set total=greatest(0,total-v_discount) where id=v_booking.id;
  insert into public.promo_redemptions(promo_code_id,booking_id,user_id,discount) values(v_code.id,v_booking.id,v_user,v_discount);
  update public.promo_codes set uses=uses+1 where id=v_code.id;
  return jsonb_build_object('discount',v_discount,'total',greatest(0,v_booking.total-v_discount));
end $$;
revoke all on function public.apply_booking_promo(uuid,text) from public,anon;
grant execute on function public.apply_booking_promo(uuid,text) to authenticated;

create or replace function public.request_booking_refund(p_booking_id uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid:=auth.uid();v_booking public.bookings;v_id uuid;
begin
  if v_user is null then raise exception 'Avval hisobingizga kiring.';end if;
  select * into v_booking from public.bookings where id=p_booking_id and user_id=v_user for update;
  if not found or v_booking.status<>'paid' then raise exception 'Refund faqat to‘langan buyurtma uchun so‘raladi.';end if;
  insert into public.refund_requests(booking_id,user_id,reason) values(p_booking_id,v_user,trim(p_reason)) returning id into v_id;
  return jsonb_build_object('id',v_id,'status','pending');
end $$;
revoke all on function public.request_booking_refund(uuid,text) from public,anon;
grant execute on function public.request_booking_refund(uuid,text) to authenticated;

commit;
