import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupportWebhook } from '../lib/support-webhook.js';

const secret = 'a'.repeat(64);
const request = (update, value = secret) => new Request('https://example.com/hook', {
  method: 'POST', headers: { 'x-telegram-bot-api-secret-token': value }, body: JSON.stringify(update),
});
function setup() {
  let state = { adminId: 1, routes: {}, deliveries: {} };
  let locked = false; let failSave = false;
  const calls = [];
  const store = {
    async config() { return { uzticket_support_webhook: secret, uzticket_support_token: 'test' }; },
    async claim() { if (locked) return null; locked = true; return structuredClone(state); },
    async save(owner, value) { if (failSave) throw new Error('offline'); state = structuredClone(value); },
    async release() { locked = false; },
  };
  return { calls, store, state: () => state, lock: () => { locked = true; }, fail: () => { failSave = true; },
    handler: createSupportWebhook(store, () => async (method, body) => { calls.push({ method, body }); return { message_id: calls.length }; }) };
}
const update = (id, text = 'salom') => ({ update_id: id, message: { message_id: id, chat: { id: 2, type: 'private' }, from: { id: 2 }, text } });
test('rejects forged webhook and malformed updates without sending messages', async () => {
  const f = setup();
  assert.equal((await f.handler(request(update(1), 'b'.repeat(64)))).status, 401);
  assert.equal((await f.handler(request({}))).status, 400);
  assert.equal(f.calls.length, 0);
});
test('persists cloud state, deduplicates retries and accepts reset Telegram IDs', async () => {
  const f = setup();
  assert.equal((await f.handler(request(update(100)))).status, 200);
  assert.equal((await f.handler(request(update(100)))).status, 200);
  assert.equal(f.calls.length, 1);
  assert.equal((await f.handler(request(update(1)))).status, 200);
  assert.equal(f.calls.length, 2);
  assert.deepEqual(f.state().completedUpdates, [100, 1]);
});
test('retries on contention and database failure instead of losing updates', async () => {
  const busy = setup(); busy.lock();
  assert.equal((await busy.handler(request(update(1)))).status, 503);
  assert.equal(busy.calls.length, 0);
  const f = setup(); f.fail();
  assert.equal((await f.handler(request(update(1, 'Admin yordam')))).status, 503);
  assert.equal(f.calls.filter(c => c.method === 'copyMessage').length, 0);
});
test('operator routes survive separate cloud invocations', async () => {
  const f = setup();
  assert.equal((await f.handler(request(update(1, 'Admin yordam')))).status, 200);
  const route = Number(Object.keys(f.state().routes)[1]);
  const reply = { update_id: 2, message: { message_id: 9, chat: { id: 1, type: 'private' }, from: { id: 1 }, text: 'Javob', reply_to_message: { message_id: route } } };
  assert.equal((await f.handler(request(reply))).status, 200);
  assert.ok(f.calls.some(c => c.method === 'copyMessage' && c.body.chat_id === 2 && c.body.from_chat_id === 1));
});
