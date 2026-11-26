import { createSupportWebhook } from '../../../lib/support-webhook.js';
import { telegramApi } from '../../../lib/telegram-bot.js';

const base = Deno.env.get('SUPABASE_URL')!;
const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const key = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const headers = { apikey: key, 'content-type': 'application/json',
  ...(key?.startsWith('sb_secret_') ? {} : { authorization: `Bearer ${key}` }) };
async function rest(path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method, headers: { ...headers, Prefer: 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('State unavailable');
  return response.json();
}
const row = 'telegram_support_state?id=eq.1';
const store = {
  config: () => rest('rpc/telegram_support_config', 'POST', {}),
  async claim(owner: string) {
    const rows = await rest(`${row}&lease_until=lt.${encodeURIComponent(new Date().toISOString())}`, 'PATCH', {
      lease_owner: owner, lease_until: new Date(Date.now() + 300000).toISOString(),
    });
    return rows[0]?.state;
  },
  async save(owner: string, state: unknown) {
    const rows = await rest(`${row}&lease_owner=eq.${owner}`, 'PATCH', { state });
    if (rows.length !== 1) throw new Error('Lease lost');
  },
  async release(owner: string) {
    await rest(`${row}&lease_owner=eq.${owner}`, 'PATCH', { lease_owner: null, lease_until: '1970-01-01T00:00:00Z' });
  },
};
Deno.serve(createSupportWebhook(store, token => (method, body) => telegramApi(token, method, body)));
