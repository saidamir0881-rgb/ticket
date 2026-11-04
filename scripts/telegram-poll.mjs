import { commands, appOrigin, replyFor, telegramApi } from '../lib/telegram-bot.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN kerak.');
const origin = appOrigin(process.env.TELEGRAM_APP_URL);
const api = (method, body = {}) => telegramApi(token, method, body);
const bot = await api('getMe');
const webhook = await api('getWebhookInfo');
if (webhook.url) throw new Error('Webhook faol. Polling boshlashdan oldin uni o‘chiring.');
await api('setMyCommands', { commands });
await api('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Chiptalar', web_app: { url: `${origin}/events` } } });
console.log(`@${bot.username} ishga tushdi.`);
let offset = 0;
let running = true;
process.on('SIGINT', () => { running = false; });
process.on('SIGTERM', () => { running = false; });
while (running) {
  try {
    const updates = await api('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
    for (const update of updates) {
      const reply = replyFor(update, origin);
      if (reply) {
        try { await api('sendMessage', reply); }
        catch (error) { console.error(error.message); }
      }
      offset = update.update_id + 1;
    }
  } catch (error) {
    console.error(error.message);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
