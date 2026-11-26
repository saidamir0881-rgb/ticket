import { handleSupport } from './telegram-support.js';

export function createSupportWebhook(store, apiFor) {
  return async request => {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const supplied = request.headers.get('x-telegram-bot-api-secret-token');
    if (!supplied || !/^[a-f0-9]{64}$/.test(supplied)) return new Response('Unauthorized', { status: 401 });
    let owner;
    try {
      const config = await store.config();
      // Compare fixed-length digests, including for malformed configured secrets.
      const digest = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
      const [a, b] = await Promise.all([digest(supplied), digest(config.uzticket_support_webhook || '')]);
      let mismatch = 0;
      const right = new Uint8Array(b);
      new Uint8Array(a).forEach((value, i) => { mismatch |= value ^ right[i]; });
      if (mismatch) return new Response('Unauthorized', { status: 401 });
      const raw = await request.text();
      if (raw.length > 1_000_000) return new Response('Too large', { status: 413 });
      let update;
      try { update = JSON.parse(raw); } catch { return new Response('Invalid JSON', { status: 400 }); }
      if (!Number.isSafeInteger(update?.update_id) || update.update_id < 0) return new Response('Invalid update', { status: 400 });
      owner = crypto.randomUUID();
      const state = await store.claim(owner);
      if (!state) return new Response('Busy', { status: 503, headers: { 'retry-after': '5' } });
      // Explicit IDs avoid dropping Telegram's randomly reset IDs after a quiet week.
      state.completedUpdates ||= [];
      if (!state.completedUpdates.includes(update.update_id)) {
        await handleSupport(update, state, apiFor(config.uzticket_support_token), () => store.save(owner, state));
        state.completedUpdates.push(update.update_id);
        state.completedUpdates = state.completedUpdates.slice(-2000);
        await store.save(owner, state);
      }
      await store.release(owner);
      owner = null;
      return new Response('ok');
    } catch {
      // Never log request bodies, Vault values, or Telegram URLs containing tokens.
      if (owner) { try { await store.release(owner); } catch { /* lease expires */ } }
      return new Response('Retry later', { status: 503 });
    }
  };
}
