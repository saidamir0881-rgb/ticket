-- Only run in Supabase SQL Editor as the project owner.
-- First register the intended administrator via the app or Supabase Auth.
-- Intended administrator: saidamir0881@gmail.com. No password is stored here.
do $$
declare
  target_email text := 'saidamir0881@gmail.com';
  target_id uuid;
begin
  select id into target_id from auth.users where lower(email)=lower(trim(target_email));
  if target_id is null then
    raise exception 'Bu email bilan Auth hisobi yo‘q. Avval hisob yarating.';
  end if;
  if exists(select 1 from public.profiles where role='admin' and id<>target_id) then
    raise exception 'Boshqa admin allaqachon tayinlangan. Hech qanday rol o‘zgartirilmadi.';
  end if;
  insert into public.profiles(id) values(target_id) on conflict(id) do nothing;
  update public.profiles set role='admin' where id=target_id;
end $$;
