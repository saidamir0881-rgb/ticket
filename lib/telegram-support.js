import { supportAnswer, supportMenu } from './support-faq.js';

export async function handleSupport(update, state, api, save) {
  const m = update.message;
  if (m?.chat?.type !== 'private' || !Number.isSafeInteger(m.chat.id) || m.chat.id <= 0 || m.from?.id !== m.chat.id || m.from?.is_bot) return;
  const id = m.chat.id;
  const say = text => api('sendMessage', { chat_id: id, text, ...(id !== state.adminId ? { reply_markup: supportMenu } : {}) });
  // Bootstrap only the explicitly configured username, then pin the immutable ID.
  if (!state.adminId && m.from.username?.toLowerCase() === 'saidagzamov_7') {
    state.adminId = id;
    await save();
    await say('Admin ulandi. Mijoz xabariga Reply qilib javob yozing. Matn, rasm va ovozli xabar yuborish mumkin.');
    return;
  }
  if (id === state.adminId) {
    const target = state.routes[String(m.reply_to_message?.message_id)];
    if (!target) { await say('Javob berish uchun mijozdan kelgan xabar yoki murojaat sarlavhasiga Reply qiling.'); return; }
    try {
      await api('copyMessage', { chat_id: target, from_chat_id: id, message_id: m.message_id });
      await say('Javob foydalanuvchiga yuborildi.');
    } catch { await say('Javob yetkazilmadi. Foydalanuvchi botni bloklagan yoki xabar turini yuborib bo‘lmasligi mumkin.'); }
    return;
  }
  if (/^\/(start|help)(?:@\w+)?(?:\s|$)/i.test(m.text || '')) {
    if (state.handoffs) { delete state.handoffs[id]; await save(); }
    await say('Assalomu alaykum! Men UZTICKET avtomatik yordamchisiman. Quyidagi bo‘limni tanlang yoki savolingizni yozing. Rasm va ovozli xabarlar administratorga yuboriladi. Administrator bilan gaplashish uchun “Administratorga yozish” tugmasini bosing. Avtomatik yordamga qaytish: /start.');
    return;
  }
  state.handoffs ||= {};
  const human = /(?:admin|operator|оператор|админ)/i.test(m.text || '');
  if (!human && !(state.handoffs[id] > Date.now())) {
    const answer = supportAnswer(m.text);
    if (answer) { await say(answer); return; }
    if (m.text && !(m.photo || m.document || m.voice || m.video || m.audio || m.sticker || m.video_note)) {
      await say('Gapingizni tushunmadim. Iltimos, savolingizni to‘liqroq yozing yoki quyidagi bo‘limlardan birini tanlang. Administrator yordami kerak bo‘lsa, “Administratorga yozish” tugmasini bosing.');
      return;
    }
  }
  if (!state.adminId) { await say('Administrator hali ulanmagan. Iltimos, birozdan so‘ng qayta yozing.'); return; }
  if (!(m.text || m.photo || m.document || m.voice || m.video || m.audio || m.sticker || m.video_note)) {
    await say('Muammoni matn, rasm yoki ovozli xabar bilan yuboring.'); return;
  }
  const key = `${id}:${m.message_id}`;
  let delivery = state.deliveries[key];
  if (!delivery) {
    const header = await api('sendMessage', { chat_id: state.adminId, text: `Yangi murojaat #${id}-${m.message_id}\nJavob berish uchun shu xabarga yoki quyidagi xabarga Reply qiling.` });
    state.routes[String(header.message_id)] = id;
    delivery = state.deliveries[key] = { header: header.message_id };
    await save();
  }
  if (!delivery.copied) {
    const copied = await api('copyMessage', { chat_id: state.adminId, from_chat_id: id, message_id: m.message_id });
    state.routes[String(copied.message_id)] = id;
    delivery.copied = true;
    await save();
  }
  // Keep follow-up messages with the operator for 30 minutes, across restarts.
  state.handoffs[id] = Date.now() + 30 * 60 * 1000;
  await save();
  await say('Murojaatingiz administratorga yuborildi. Javob shu botga keladi.');
}
