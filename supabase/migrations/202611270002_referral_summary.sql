begin;
create or replace function public.count_my_referrals()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.referrals where referred_by=auth.uid()
$$;
revoke all on function public.count_my_referrals() from public,anon;
grant execute on function public.count_my_referrals() to authenticated;
commit;
