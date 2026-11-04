import test from 'node:test';
import assert from 'node:assert/strict';
import { appOrigin, replyFor, telegramApi } from '../lib/telegram-bot.js';
const origin = appOrigin();
const update = text => ({ message: { chat: { id: 42, type: 'private' }, text } });
test('private commands open the correct HTTPS Mini App pages', () => {
  for (const [command, path] of [['events', '/events'], ['account', '/account'], ['points', '/points'], ['help', '/help']]) {
    const reply = replyFor(update(`/${command}@uzticket_uzbot`), origin);
    assert.ok(reply.reply_markup.inline_keyboard.flat().some(button => button.web_app?.url === origin + path));
    assert.equal(reply.chat_id, 42);
  }
  assert.equal(replyFor(update('/start'), origin).reply_markup.inline_keyboard.length, 4);
  assert.equal(replyFor(update('/start'), origin).reply_markup.inline_keyboard[3][0].url, 'https://t.me/uzticket_supportbot');
});
test('ignore group and non-text updates; never reflect user text', () => {
  assert.equal(replyFor({ message: { chat: { id: -42, type: 'group' }, text: '/start' } }, origin), null);
  assert.equal(replyFor({}, origin), null);
  assert.ok(!JSON.stringify(replyFor(update('private-secret'), origin)).includes('private-secret'));
  assert.throws(() => appOrigin('http://example.com'));
});
test('network errors do not expose token', async () => {
  await assert.rejects(telegramApi('secret', 'getMe', {}, () => { throw new Error('secret'); }), error => !error.message.includes('secret'));
});
