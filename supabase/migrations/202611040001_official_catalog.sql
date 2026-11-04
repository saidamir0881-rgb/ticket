begin;
alter table public.events add column inventory_mode text not null default 'local' check(inventory_mode in ('local','external'));
alter table public.events add column source_url text;
alter table public.events add column source_name text;
alter table public.events add column source_checked_at timestamptz;
alter table public.events add column source_available_tickets integer;
alter table public.events add column max_price numeric(12,0);
alter table public.events add column ends_at timestamptz;
alter table public.events add column age_limit text;
alter table public.events add constraint external_source_required check(inventory_mode<>'external' or source_url like 'https://%');
-- Preserve historical bookings and tickets. Only remove samples from the catalog.
update public.events set status='draft',featured=false where is_demo;
create function public.check_local_inventory() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.events where id=new.event_id and (inventory_mode='external' or is_demo)) then
    raise exception 'Bu tadbir uchun mahalliy joy yoki buyurtma yaratilmaydi.';
  end if;
  return new;
end $$;
create trigger local_seats_only before insert or update of event_id on public.seats for each row execute function public.check_local_inventory();
create trigger local_bookings_only before insert or update of event_id on public.bookings for each row execute function public.check_local_inventory();
revoke all on function public.check_local_inventory() from public,anon,authenticated;
-- Exact bearer-token lookup only; no customer name, email or contact information.
create function public.public_ticket(p_token text) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'ticket',jsonb_build_object('id',t.id,'qr_token',t.qr_token,'used_at',t.used_at),
    'event',jsonb_build_object('title',e.title,'starts_at',e.starts_at,'venue',jsonb_build_object('name',v.name)),
    'seat',jsonb_build_object('row_label',s.row_label,'seat_number',s.seat_number,'price',bs.price),
    'reference',b.reference,
    'invalid',(e.is_demo or e.inventory_mode='external' or b.status<>'paid' or e.status<>'published'))
  from public.tickets t join public.bookings b on b.id=t.booking_id
    join public.events e on e.id=b.event_id join public.venues v on v.id=e.venue_id
    join public.booking_seats bs on bs.id=t.booking_seat_id join public.seats s on s.id=bs.seat_id
  where t.qr_token=p_token and p_token ~ '^[a-fA-F0-9]{64}$' limit 1;
$$;
revoke all on function public.public_ticket(text) from public,anon,authenticated;
grant execute on function public.public_ticket(text) to anon,authenticated;
commit;
