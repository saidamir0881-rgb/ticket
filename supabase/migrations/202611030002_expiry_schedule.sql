-- Optional scheduled cleanup. Core correctness does not depend on cron: every
-- reservation/payment transaction expires old claims, and maps ignore expired holds.
-- Enable pg_cron in Dashboard > Database > Extensions if this notice appears.
do $outer$
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    if not exists(select 1 from cron.job where jobname='uzticket-expire-reservations') then
      perform cron.schedule('uzticket-expire-reservations','* * * * *','select public.expire_reservations()');
    end if;
  else
    raise notice 'Enable pg_cron then re-run this migration to clean expired rows every minute.';
  end if;
end
$outer$;
