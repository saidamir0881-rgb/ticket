-- Cloud-only state. Neither customers nor website admins can access this table.
create table public.telegram_support_state (
  id integer primary key check (id = 1),
  state jsonb not null,
  lease_owner uuid,
  lease_until timestamptz not null default '1970-01-01T00:00:00Z'
);
alter table public.telegram_support_state enable row level security;
revoke all on public.telegram_support_state from public, anon, authenticated;
grant select, insert, update on public.telegram_support_state to service_role;

-- A machine-only accessor to encrypted Vault secrets; no caller-controlled lookup.
create function public.telegram_support_config() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_object_agg(name, decrypted_secret)
  from vault.decrypted_secrets
  where name in ('uzticket_support_token', 'uzticket_support_webhook');
$$;
revoke all on function public.telegram_support_config() from public, anon, authenticated;
grant execute on function public.telegram_support_config() to service_role;
