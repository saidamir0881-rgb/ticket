import fs from 'node:fs';
import { telegramApi } from '../lib/telegram-bot.js';
import { handleSupport } from '../lib/telegram-support.js';
const token = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_SUPPORT_BOT_TOKEN kerak.');
fs.mkdirSync('.sites-runtime', { recursive: true });
const file = '.sites-runtime/support-state.json';
const state = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { offset: 0, adminId: null, routes: {}, deliveries: {} };
function save() { fs.writeFileSync(file + '.tmp', JSON.stringify(state)); fs.renameSync(file + '.tmp', file); }
const api = (method, body = {}) => telegramApi(token, method, body);
const bot = await api('getMe');
if (bot.username.toLowerCase() !== 'uzticket_supportbot') throw new Error('Support bot tokeni mos emas.');
if ((await api('getWebhookInfo')).url) throw new Error('Webhook faol; polling boshlanmadi.');
await api('setMyCommands', { commands: [{ command: 'start', description: 'Administratorga murojaat' }, { command: 'help', description: 'Yordam' }] });
console.log('@uzticket_supportbot ishga tushdi.');
while (true) {
  try {
    const updates = await api('getUpdates', { offset: state.offset, timeout: 25, allowed_updates: ['message'] });
    for (const update of updates) {
      await handleSupport(update, state, api, save);
      state.offset = update.update_id + 1;
      save();
    }
  } catch { console.error('Support: vaqtinchalik xato, qayta uriniladi.'); await new Promise(resolve => setTimeout(resolve, 5000)); }
}
