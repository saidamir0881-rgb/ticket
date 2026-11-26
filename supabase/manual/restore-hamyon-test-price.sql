-- Restore the Shohruhxon prices saved by hamyon-test-price-1000.sql.
begin;
do $$
declare v_event uuid:='30000000-0000-4000-8000-000000006394';v_restored int;
begin
  if not exists(select 1 from public.hamyon_test_price_event_backup where event_id=v_event) then
    raise exception 'No saved Shohruhxon test prices found.';
  end if;
  update public.seats s set price=b.price from public.hamyon_test_price_seat_backup b where b.seat_id=s.id and b.event_id=v_event;
  get diagnostics v_restored=row_count;
  if v_restored=0 then raise exception 'No seat prices were restored.';end if;
  update public.events e set min_price=b.min_price,max_price=b.max_price from public.hamyon_test_price_event_backup b where e.id=b.event_id;
  delete from public.hamyon_test_price_seat_backup where event_id=v_event;
  delete from public.hamyon_test_price_event_backup where event_id=v_event;
end $$;
commit;
