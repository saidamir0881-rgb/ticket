import test from 'node:test';
import assert from 'node:assert/strict';
import { handleSupport } from '../lib/telegram-support.js';
const message = (id, text, extra = {}) => ({ message: { chat: { type: 'private', id }, from: { id }, message_id: 7, text, ...extra } });
test('pins intended admin and rejects username takeover after enrollment', async () => {
  const state = { routes: {}, deliveries: {} };
  const api = async () => ({ message_id: 10 });
  await handleSupport(message(1, '/start', { from: { id: 1, username: 'Saidagzamov_7' } }), state, api, () => {});
  assert.equal(state.adminId, 1);
  await handleSupport(message(2, '/start', { from: { id: 2, username: 'Saidagzamov_7' } }), state, api, () => {});
  assert.equal(state.adminId, 1);
});
test('routes replies using stored message IDs, including after restart', async () => {
  let state = { adminId: 1, routes: {}, deliveries: {} };
  const calls = []; let n = 10;
  const api = async (method, body) => { calls.push({ method, body }); return { message_id: ++n }; };
  await handleSupport(message(2, 'Muammo'), state, api, () => {});
  const replyId = Number(Object.keys(state.routes)[1]);
  state = JSON.parse(JSON.stringify(state));
  await handleSupport(message(1, 'Javob', { reply_to_message: { message_id: replyId } }), state, api, () => {});
  assert.ok(calls.some(c => c.method === 'copyMessage' && c.body.chat_id === 2 && c.body.from_chat_id === 1));
  const before = calls.filter(c => c.method === 'copyMessage').length;
  await handleSupport(message(3, '/start', { reply_to_message: { message_id: replyId } }), state, api, () => {});
  assert.equal(calls.filter(c => c.method === 'copyMessage').length, before);
});
