-- UZTICKET: execute as postgres via Supabase SQL Editor or `supabase db push`.
begin;
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check(length(full_name) <= 100),
  phone text not null default '' check(length(phone) <= 30),
  role text not null default 'customer' check(role in ('customer','admin')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index only_one_admin on public.profiles(role) where role = 'admin';
create table public.venues (
  id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 150),
  city text not null default 'Toshkent', address text not null,
  type text not null default 'hall' check(type in ('hall','arena','stadium','theatre')),
  image_url text, layout jsonb not null default '[{"label":"1","count":10,"price":500000,"category":"VIP"}]'::jsonb check(jsonb_typeof(layout) = 'array'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.events (
  id uuid primary key default gen_random_uuid(), venue_id uuid not null references public.venues(id) on delete restrict,
  title text not null check(length(title) between 1 and 180), description text not null default '',
  category text not null check(category in ('concert','theatre','sport','comedy','festival')),
  starts_at timestamptz not null, poster_url text,
  status text not null default 'draft' check(status in ('draft','published','cancelled')),
  min_price numeric(12,0) not null default 0 check(min_price >= 0),
  featured boolean not null default false, is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index events_catalog on public.events(status, starts_at);
create index events_venue on public.events(venue_id);
create table public.seats (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
  row_label text not null check(length(row_label) between 1 and 12), row_order int not null default 1 check(row_order > 0),
  seat_number int not null check(seat_number between 1 and 100),
  price numeric(12,0) not null check(price >= 0), category text not null default 'Standard' check(length(category) between 1 and 50),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(event_id,row_label,seat_number), unique(id,event_id)
);
create index seats_event on public.seats(event_id,row_order,seat_number);
create table public.bookings (
  id uuid primary key default gen_random_uuid(), reference text not null unique default ('UZ-' || upper(encode(extensions.gen_random_bytes(6),'hex'))),
  user_id uuid not null references public.profiles(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  status text not null default 'pending' check(status in ('pending','paid','cancelled','expired')),
  total numeric(12,0) not null check(total >= 0), expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,event_id)
);
create index bookings_user on public.bookings(user_id,created_at desc);
create index bookings_event on public.bookings(event_id);
create index bookings_expiry on public.bookings(expires_at) where status = 'pending';
create table public.booking_seats (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null, seat_id uuid not null, event_id uuid not null,
  price numeric(12,0) not null check(price >= 0), released_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(booking_id,event_id) references public.bookings(id,event_id) on delete restrict,
  foreign key(seat_id,event_id) references public.seats(id,event_id) on delete restrict,
  unique(booking_id,seat_id)
);
-- Final independent database invariant: one active owner for any seat, even under races.
create unique index one_active_claim_per_seat on public.booking_seats(seat_id) where released_at is null;
create index booking_seats_booking on public.booking_seats(booking_id);
create table public.payments (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null unique references public.bookings(id) on delete restrict,
  amount numeric(12,0) not null check(amount >= 0), method text not null default 'cash' check(method = 'cash'),
  status text not null default 'pending' check(status in ('pending','paid','cancelled','expired')),
  confirmed_by uuid references public.profiles(id), confirmed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tickets (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete restrict,
  booking_seat_id uuid not null unique references public.booking_seats(id) on delete restrict,
  qr_token text not null unique default encode(extensions.gen_random_bytes(32),'hex'),
  used_at timestamptz, used_by uuid references public.profiles(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index tickets_booking on public.tickets(booking_id);

create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','venues','events','seats','bookings','booking_seats','payments','tickets'] loop
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
  execute format('alter table public.%I enable row level security',t);
end loop; end $$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),100)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,full_name) select id,left(coalesce(raw_user_meta_data->>'full_name',''),100) from auth.users on conflict(id) do nothing;

-- Explicit privileges: there are NO direct client writes to financial/claim/ticket tables.
revoke all on public.profiles,public.venues,public.events,public.seats,public.bookings,public.booking_seats,public.payments,public.tickets from anon,authenticated;
grant select on public.venues,public.events,public.seats to anon,authenticated;
grant select on public.profiles,public.bookings,public.booking_seats,public.payments,public.tickets to authenticated;
grant update(full_name,phone) on public.profiles to authenticated;
grant insert,update,delete on public.venues,public.events,public.seats to authenticated;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profiles_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy venues_read on public.venues for select to anon,authenticated using(true);
create policy venues_admin on public.venues for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy events_read on public.events for select to anon,authenticated using(status='published' or public.is_admin());
create policy events_admin on public.events for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy seats_read on public.seats for select to anon,authenticated using(exists(select 1 from public.events e where e.id=event_id and (e.status='published' or public.is_admin())));
create policy seats_admin on public.seats for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy bookings_owner on public.bookings for select to authenticated using(user_id=auth.uid() or public.is_admin());
create policy claims_owner on public.booking_seats for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and (b.user_id=auth.uid() or public.is_admin())));
create policy payments_owner on public.payments for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and (b.user_id=auth.uid() or public.is_admin())));
create policy tickets_owner on public.tickets for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and (b.user_id=auth.uid() or public.is_admin())));

-- All transitions lock by event first, then row. Consistent order prevents deadlocks.
-- Internal maintenance helper; never exposed to API roles.
create function public.expire_event_reservations(p_event_id uuid) returns int language plpgsql security definer set search_path = '' as $$
declare v_ids uuid[]; v_count int;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text,0));
  select array_agg(id) into v_ids from public.bookings where event_id=p_event_id and status='pending' and expires_at<=clock_timestamp();
  if v_ids is null then return 0; end if;
  update public.bookings set status='expired' where id=any(v_ids) and status='pending';
  get diagnostics v_count = row_count;
  update public.booking_seats set released_at=clock_timestamp() where booking_id=any(v_ids) and released_at is null;
  update public.payments set status='expired' where booking_id=any(v_ids) and status='pending';
  return v_count;
end $$;
create function public.expire_reservations() returns int language plpgsql security definer set search_path = '' as $$
declare v_event uuid; v_count int := 0;
begin
  for v_event in select distinct event_id from public.bookings where status='pending' and expires_at<=clock_timestamp() order by event_id loop
    v_count := v_count + public.expire_event_reservations(v_event);
  end loop;
  return v_count;
end $$;
create function public.reserve_seats(p_event_id uuid,p_seat_ids uuid[]) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_event public.events; v_booking public.bookings; v_total numeric; v_count int;
begin
  if auth.uid() is null then raise exception 'Avval hisobingizga kiring.'; end if;
  if cardinality(p_seat_ids) is null or cardinality(p_seat_ids) not between 1 and 8 or array_position(p_seat_ids,null) is not null then raise exception '1 dan 8 tagacha joy tanlang.'; end if;
  if (select count(distinct s) from unnest(p_seat_ids) s) <> cardinality(p_seat_ids) then raise exception 'Takroriy joylar mumkin emas.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_event_id::text,0));
  select * into v_event from public.events where id=p_event_id for update;
  if not found or v_event.status<>'published' or v_event.starts_at<=clock_timestamp() then raise exception 'Tadbir band qilish uchun ochiq emas.'; end if;
  perform public.expire_event_reservations(p_event_id);
  if (select count(*) from public.bookings where user_id=auth.uid() and status='pending' and expires_at>clock_timestamp()) >= 3 then raise exception 'Avval mavjud buyurtmalaringizni to‘lang yoki bekor qiling.'; end if;
  perform id from public.seats where event_id=p_event_id and id=any(p_seat_ids) order by id for update;
  select count(*),sum(price) into v_count,v_total from public.seats where event_id=p_event_id and id=any(p_seat_ids);
  if v_count<>cardinality(p_seat_ids) then raise exception 'Joylar ushbu tadbirga tegishli emas.'; end if;
  if exists(select 1 from public.booking_seats where seat_id=any(p_seat_ids) and released_at is null) then raise exception 'Tanlangan joy band bo‘lib qoldi. Boshqa joy tanlang.'; end if;
  insert into public.bookings(user_id,event_id,total,expires_at) values(auth.uid(),p_event_id,v_total,clock_timestamp()+interval '10 minutes') returning * into v_booking;
  insert into public.booking_seats(booking_id,seat_id,event_id,price) select v_booking.id,id,event_id,price from public.seats where id=any(p_seat_ids);
  insert into public.payments(booking_id,amount) values(v_booking.id,v_total);
  return jsonb_build_object('id',v_booking.id,'reference',v_booking.reference,'total',v_total,'expires_at',v_booking.expires_at);
end $$;
create function public.confirm_cash_payment(p_booking_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_event uuid;
begin
  if not public.is_admin() then raise exception 'Admin ruxsati kerak.'; end if;
  select event_id into v_event from public.bookings where id=p_booking_id;
  if not found then raise exception 'Buyurtma topilmadi.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_event::text,0));
  perform public.expire_event_reservations(v_event);
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if v_booking.status='paid' then return jsonb_build_object('status','paid','already_confirmed',true); end if;
  if v_booking.status<>'pending' or v_booking.expires_at<=clock_timestamp() then return jsonb_build_object('status',v_booking.status,'error','Band qilish muddati tugagan yoki buyurtma bekor qilingan.'); end if;
  if not exists(select 1 from public.events where id=v_event and status='published' and starts_at>clock_timestamp()) then raise exception 'Tadbir to‘lov uchun ochiq emas.'; end if;
  if not exists(select 1 from public.booking_seats where booking_id=p_booking_id) or exists(select 1 from public.booking_seats where booking_id=p_booking_id and released_at is not null) then raise exception 'Joy bandi yaroqsiz.'; end if;
  update public.bookings set status='paid' where id=p_booking_id;
  update public.payments set status='paid',confirmed_at=clock_timestamp(),confirmed_by=auth.uid() where booking_id=p_booking_id;
  insert into public.tickets(booking_id,booking_seat_id) select p_booking_id,id from public.booking_seats where booking_id=p_booking_id;
  return jsonb_build_object('status','paid');
end $$;
create function public.cancel_booking(p_booking_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_booking public.bookings; v_event uuid;
begin
  select event_id into v_event from public.bookings where id=p_booking_id and (user_id=auth.uid() or public.is_admin());
  if not found then raise exception 'Buyurtma topilmadi.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_event::text,0));
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if v_booking.status<>'pending' then raise exception 'Faqat to‘lanmagan bandni bekor qilish mumkin. To‘langan buyurtma uchun kassaga murojaat qiling.'; end if;
  update public.bookings set status='cancelled' where id=p_booking_id;
  update public.booking_seats set released_at=clock_timestamp() where booking_id=p_booking_id and released_at is null;
  update public.payments set status='cancelled' where booking_id=p_booking_id;
  return jsonb_build_object('status','cancelled');
end $$;
create function public.get_event_seats(p_event_id uuid) returns table(id uuid,row_label text,row_order int,seat_number int,price numeric,category text,status text) language sql stable security definer set search_path = '' as $$
  select s.id,s.row_label,s.row_order,s.seat_number,s.price,s.category,
    case when b.status='paid' then 'sold' when b.status='pending' and b.expires_at>clock_timestamp() then 'reserved' else 'available' end
  from public.seats s join public.events e on e.id=s.event_id
  left join public.booking_seats bs on bs.seat_id=s.id and bs.released_at is null
  left join public.bookings b on b.id=bs.booking_id
  where s.event_id=p_event_id and (e.status='published' or public.is_admin())
  order by s.row_order,s.seat_number;
$$;
create function public.verify_ticket(p_token text,p_mark_used boolean default true) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ticket public.tickets; v_info jsonb;
begin
  if not public.is_admin() then raise exception 'Admin ruxsati kerak.'; end if;
  select * into v_ticket from public.tickets where qr_token=p_token for update;
  if not found then return jsonb_build_object('status','invalid'); end if;
  if not exists(select 1 from public.bookings b join public.events e on e.id=b.event_id where b.id=v_ticket.booking_id and b.status='paid' and e.status='published') then return jsonb_build_object('status','invalid'); end if;
  select jsonb_build_object('event',e.title,'reference',b.reference,'row',s.row_label,'seat',s.seat_number) into v_info
    from public.bookings b join public.events e on e.id=b.event_id join public.booking_seats bs on bs.id=v_ticket.booking_seat_id join public.seats s on s.id=bs.seat_id where b.id=v_ticket.booking_id;
  if v_ticket.used_at is not null then return v_info || jsonb_build_object('status','used','used_at',v_ticket.used_at); end if;
  if p_mark_used then update public.tickets set used_at=clock_timestamp(),used_by=auth.uid() where id=v_ticket.id; end if;
  return v_info || jsonb_build_object('status','valid','marked_used',p_mark_used);
end $$;

-- Create event and its independent seating map in one transaction.
create function public.create_event_with_seats(p_event jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_event uuid; v_layout jsonb; v_row jsonb; v_order int:=0;
begin
  if not public.is_admin() then raise exception 'Admin ruxsati kerak.'; end if;
  select layout into v_layout from public.venues where id=(p_event->>'venue_id')::uuid;
  if not found then raise exception 'Manzil topilmadi.'; end if;
  if jsonb_array_length(v_layout) not between 1 and 100 then raise exception '1-100 ta qator kerak.'; end if;
  insert into public.events(venue_id,title,description,category,starts_at,poster_url,status,featured,is_demo,min_price)
  values((p_event->>'venue_id')::uuid,p_event->>'title',coalesce(p_event->>'description',''),p_event->>'category',(p_event->>'starts_at')::timestamptz,p_event->>'poster_url',coalesce(p_event->>'status','draft'),coalesce((p_event->>'featured')::boolean,false),coalesce((p_event->>'is_demo')::boolean,false),0) returning id into v_event;
  for v_row in select value from jsonb_array_elements(v_layout) loop
    v_order:=v_order+1;
    if (v_row->>'count')::int not between 1 and 100 then raise exception 'Qatorda 1-100 ta joy bo‘lishi kerak.'; end if;
    insert into public.seats(event_id,row_label,row_order,seat_number,price,category)
      select v_event,v_row->>'label',v_order,n,(v_row->>'price')::numeric,coalesce(v_row->>'category','Standard') from generate_series(1,(v_row->>'count')::int) n;
  end loop;
  update public.events set min_price=(select min(price) from public.seats where event_id=v_event) where id=v_event;
  return v_event;
end $$;
create function public.admin_stats() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin ruxsati kerak.'; end if;
  return jsonb_build_object('events',(select count(*) from public.events),'bookings',(select count(*) from public.bookings),
    'sold',(select count(*) from public.tickets),
    'available',(select count(*) from public.seats s where not exists(select 1 from public.booking_seats bs join public.bookings b on b.id=bs.booking_id where bs.seat_id=s.id and bs.released_at is null and (b.status='paid' or (b.status='pending' and b.expires_at>clock_timestamp())))),
    'pending',(select count(*) from public.bookings where status='pending' and expires_at>clock_timestamp()),
    'revenue',(select coalesce(sum(amount),0) from public.payments where status='paid'));
end $$;
-- Disallow moving a booked seat to another event or changing its identity.
create function public.protect_seat_identity() returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.event_id,new.row_label,new.seat_number) is distinct from (old.event_id,old.row_label,old.seat_number) and exists(select 1 from public.booking_seats where seat_id=old.id) then raise exception 'Buyurtmali joyning joylashuvini o‘zgartirib bo‘lmaydi.'; end if;
  return new;
end $$;
create trigger protect_seat_identity before update on public.seats for each row execute function public.protect_seat_identity();
create function public.sync_min_price() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_event uuid;
begin
  v_event:=coalesce(new.event_id,old.event_id);
  update public.events set min_price=coalesce((select min(price) from public.seats where event_id=v_event),0) where id=v_event;
  return null;
end $$;
create trigger sync_min_price after insert or update or delete on public.seats for each row execute function public.sync_min_price();

-- PostgreSQL grants EXECUTE to PUBLIC by default: remove it for every function here.
revoke all on function public.touch_updated_at(),public.is_admin(),public.handle_new_user(),public.expire_event_reservations(uuid),public.expire_reservations(),public.reserve_seats(uuid,uuid[]),public.confirm_cash_payment(uuid),public.cancel_booking(uuid),public.get_event_seats(uuid),public.verify_ticket(text,boolean),public.create_event_with_seats(jsonb),public.admin_stats(),public.protect_seat_identity(),public.sync_min_price() from public,anon,authenticated;
grant execute on function public.is_admin(),public.get_event_seats(uuid) to anon,authenticated;
grant execute on function public.reserve_seats(uuid,uuid[]),public.confirm_cash_payment(uuid),public.cancel_booking(uuid),public.verify_ticket(text,boolean),public.create_event_with_seats(jsonb),public.admin_stats() to authenticated;
grant execute on function public.expire_reservations() to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('event-posters','event-posters',true,5242880,array['image/jpeg','image/png','image/webp']),
 ('ticket-assets','ticket-assets',false,5242880,array['image/png','application/pdf']) on conflict(id) do nothing;
create policy posters_public_read on storage.objects for select to anon,authenticated using(bucket_id='event-posters');
create policy posters_admin_insert on storage.objects for insert to authenticated with check(bucket_id='event-posters' and public.is_admin());
create policy posters_admin_update on storage.objects for update to authenticated using(bucket_id='event-posters' and public.is_admin()) with check(bucket_id='event-posters' and public.is_admin());
create policy posters_admin_delete on storage.objects for delete to authenticated using(bucket_id='event-posters' and public.is_admin());
create policy ticket_assets_owner_read on storage.objects for select to authenticated using(bucket_id='ticket-assets' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));
create policy ticket_assets_admin_write on storage.objects for insert to authenticated with check(bucket_id='ticket-assets' and public.is_admin());
commit;


-- Fictional demonstration data only. Safe to re-run. No admin credentials.
begin;
insert into public.venues(id,name,city,address,type,image_url,layout) values
 ('10000000-0000-4000-8000-000000000001','Humo Arena','Toshkent','Afrosiyob ko‘chasi, Toshkent','arena','https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900&auto=format&fit=crop&q=85','[]'),
 ('10000000-0000-4000-8000-000000000002','Bunyodkor stadioni','Toshkent','Bunyodkor shohko‘chasi, Toshkent','stadium','https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&auto=format&fit=crop&q=85','[]'),
 ('10000000-0000-4000-8000-000000000003','O‘zbek Milliy teatri','Toshkent','Alisher Navoiy ko‘chasi, Toshkent','theatre','https://images.unsplash.com/photo-1503095396549-807759245b35?w=900&auto=format&fit=crop&q=85','[]'),
 ('10000000-0000-4000-8000-000000000004','Toshkent konsert zali','Toshkent','Toshkent shahri','hall','https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&auto=format&fit=crop&q=85','[]')
on conflict(id) do nothing;
update public.venues set layout=(select jsonb_agg(jsonb_build_object('label',r::text,'count',12,'price',case when r=1 then 500000 when r=2 then 450000 when r=3 then 400000 when r=4 then 350000 when r=5 then 300000 when r<=10 then 200000 else 100000 end,'category',case when r<=2 then 'VIP' else 'Standard' end) order by r) from generate_series(1,20) r)
where id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004') and layout='[]'::jsonb;
insert into public.events(id,venue_id,title,description,category,starts_at,status,is_demo,featured,poster_url) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Musiqa bilan birga yashang','DEMO: Concert 2026 — namoyish uchun yaratilgan xayoliy tadbir. Rasmiy e’lon emas.','concert','2026-12-12T19:00:00+05:00','published',true,true,'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&auto=format&fit=crop&q=90'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Katta futbol oqshomi','DEMO: Bunyodkor stadionidagi xayoliy futbol uchrashuvi. Rasmiy jadval emas.','sport','2026-12-14T18:00:00+05:00','published',true,false,'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=85'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','Sahna sehriga sayohat','DEMO: Namuna teatr tomoshasi. Rasmiy e’lon emas.','theatre','2026-12-16T19:00:00+05:00','published',true,false,'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=85'),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','Stand Up: kulgi kechasi','DEMO: Xayoliy stand-up dasturi. Rasmiy e’lon emas.','comedy','2026-12-18T19:00:00+05:00','published',true,false,'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&auto=format&fit=crop&q=85'),
 ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','Music Festival 2026','DEMO: Namuna musiqa festivali. Rasmiy e’lon emas.','festival','2026-12-20T17:00:00+05:00','published',true,false,'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900&auto=format&fit=crop&q=85') on conflict(id) do nothing;
insert into public.seats(event_id,row_label,row_order,seat_number,price,category)
select e.id,r::text,r,n,case when r=1 then 500000 when r=2 then 450000 when r=3 then 400000 when r=4 then 350000 when r=5 then 300000 when r<=10 then 200000 else 100000 end,case when r<=2 then 'VIP' else 'Standard' end
from public.events e cross join generate_series(1,20) r cross join generate_series(1,12) n
where e.id in ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000005')
on conflict(event_id,row_label,seat_number) do nothing;
commit;
