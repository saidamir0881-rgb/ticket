-- Retire from sale without deleting historical orders or tickets.
update public.events set status='draft',featured=false where id='30000000-0000-4000-8000-000000006351';
