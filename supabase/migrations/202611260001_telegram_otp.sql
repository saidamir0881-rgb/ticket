begin;

create table if not exists public.telegram_otp_sessions (
  id uuid primary key,
  phone text not null check (phone ~ '^\+998[0-9]{9}$'),
  status text not null check (status in ('waiting_bot','waiting_contact','otp_sent','verified','registering','blocked','expired')),
  created_at timestamptz not null default now(),
  start_expires_at timestamptz not null,
  start_token_hash text not null unique,
  telegram_user_id bigint,
  chat_id bigint,
  otp_hash text,
  otp_expires_at timestamptz,
  attempts integer not null default 0 check (attempts between 0 and 5),
  verified_expires_at timestamptz
);
create index if not exists telegram_otp_telegram_user_idx on public.telegram_otp_sessions(telegram_user_id,created_at desc);
create index if not exists telegram_otp_created_at_idx on public.telegram_otp_sessions(created_at);
alter table public.telegram_otp_sessions enable row level security;
revoke all on public.telegram_otp_sessions from public,anon,authenticated;
grant select,insert,update,delete on public.telegram_otp_sessions to service_role;

create table if not exists public.telegram_otp_rate_limits (
  key_hash text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0)
);
alter table public.telegram_otp_rate_limits enable row level security;
revoke all on public.telegram_otp_rate_limits from public,anon,authenticated;
grant select,insert,update,delete on public.telegram_otp_rate_limits to service_role;

create or replace function public.consume_telegram_otp_rate_limit(p_key text,p_max integer,p_window_seconds integer)
returns table(allowed boolean,retry_after integer)
language plpgsql security definer set search_path = '' as $$
declare r public.telegram_otp_rate_limits%rowtype; t timestamptz := pg_catalog.now();
begin
  if p_max < 1 or p_window_seconds < 1 or p_key !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid rate limit arguments';
  end if;
  delete from public.telegram_otp_rate_limits where window_started_at < t - interval '1 day';
  insert into public.telegram_otp_rate_limits(key_hash,window_started_at,request_count)
    values(p_key,t,1) on conflict(key_hash) do nothing;
  select * into r from public.telegram_otp_rate_limits where key_hash=p_key for update;
  if r.window_started_at <= t - pg_catalog.make_interval(secs => p_window_seconds) then
    update public.telegram_otp_rate_limits set window_started_at=t,request_count=1 where key_hash=p_key;
    return query select true,0; return;
  end if;
  if r.request_count >= p_max then
    return query select false,greatest(1,ceil(extract(epoch from (r.window_started_at + pg_catalog.make_interval(secs => p_window_seconds) - t)))::integer); return;
  end if;
  update public.telegram_otp_rate_limits set request_count=request_count+1 where key_hash=p_key;
  return query select true,0;
end $$;
revoke all on function public.consume_telegram_otp_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_telegram_otp_rate_limit(text,integer,integer) to service_role;

commit;
