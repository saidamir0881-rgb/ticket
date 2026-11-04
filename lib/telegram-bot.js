import { supportUrl } from './support.js';

export const commands = [
  { command: 'start', description: 'Bosh menyu' },
  { command: 'events', description: 'Tadbirlar va chiptalar' },
  { command: 'account', description: 'Buyurtmalarim va chiptalarim' },
  { command: 'points', description: 'Kassalar xaritasi' },
  { command: 'help', description: 'Yordam' },
  { command: 'support', description: '24/7 yordam — adminga yozish' },
];

export function appOrigin(value = 'https://ticket-997e.vercel.app') {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('HTTPS sayt manzili kerak.');
  return url.origin;
}

export function replyFor(update, origin) {
  const message = update?.message;
  if (message?.chat?.type !== 'private' || !Number.isSafeInteger(message.chat.id) || message.chat.id <= 0 || typeof message.text !== 'string') return null;
  const command = message.text.trim().split(/\s/)[0].split('@')[0].toLowerCase();
  const pages = {
    '/events': ['Tadbirni tanlang, joylarni ko‘ring va chiptangizni band qiling.', 'Tadbirlarni ochish', '/events'],
    '/account': ['Buyurtmalar va QR chiptalaringiz kabinetda. Saytdagi hisobingiz bilan kiring.', 'Kabinetim', '/account'],
    '/points': ['Naqd to‘lov uchun kassani tanlang. Xarita va eng yaqin punktni topish sahifada mavjud.', 'Kassalar xaritasi', '/points'],
    '/help': ['Tadbir → joy tanlash → hisobga kirish → to‘lov. Karta to‘lovi uchun chek yuboring; tasdiqdan keyin QR chipta kabinetda paydo bo‘ladi. Naqd buyurtmani belgilangan muddatda kassada to‘lang.', 'Yordam sahifasi', '/help'],
  };
  const page = pages[command];
  const button = (text, path) => ({ text, web_app: { url: new URL(path, origin).href } });
  if (command === '/support') return { chat_id: message.chat.id, text: '💬 UZTICKET yordam xizmati\n\nTo‘lov, buyurtma yoki chipta bo‘yicha savolingizni support botga yozing. Murojaatlar 24/7 qabul qilinadi. Administratorning javobi o‘sha botga keladi.', reply_markup: { inline_keyboard: [[{ text: '✉️ 24/7 yordam — yozish', url: supportUrl }], [button('Savollarga javoblar', '/help')]] } };
  return {
    chat_id: message.chat.id,
    text: page?.[0] || 'UZTICKET’ga xush kelibsiz! Tadbirlarni toping, joy tanlang va chiptalaringizni kabinetda saqlang. Kerakli bo‘limni oching:',
    reply_markup: { inline_keyboard: page ? [...(command === '/help' && supportUrl ? [[{ text: '💬 Administratorga yozish', url: supportUrl }]] : []), [button(page[1], page[2])], [button('Barcha tadbirlar', '/events')]] : [
      [button('🎟 Tadbirlar va chiptalar', '/events')],
      [button('👤 Buyurtmalarim', '/account'), button('📍 Kassalar', '/points')],
      [button('❓ Yordam', '/help')],
      [{ text: '✉️ 24/7 yordam — murojaat yozish', url: supportUrl }],
    ] },
  };
}

export async function telegramApi(token, method, body, fetcher = fetch) {
  let response;
  try {
    response = await fetcher(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(40000),
    });
    const data = await response.json();
    if (response.ok && data.ok) return data.result;
  } catch { /* Never expose a fetch error containing the token URL. */ }
  throw new Error(`Telegram ${method} bajarilmadi (${response?.status || 'network'}).`);
}
