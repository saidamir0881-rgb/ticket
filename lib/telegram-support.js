export async function handleSupport(update, state, api, save) {
  const m = update.message;
  if (m?.chat?.type !== 'private' || !Number.isSafeInteger(m.chat.id) || m.chat.id <= 0 || m.from?.id !== m.chat.id || m.from?.is_bot) return;
  const id = m.chat.id;
  const say = text => api('sendMessage', { chat_id: id, text });
  // Bootstrap only the explicitly configured username, then pin the immutable ID.
  if (!state.adminId && m.from.username?.toLowerCase() === 'saidagzamov_7') {
    state.adminId = id;
    save();
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
    await say('Assalomu alaykum! Qanday muammo yuz berdi? Yozib qoldiring, tez orada administrator javob beradi. Matn, rasm yoki ovozli xabar yuborishingiz mumkin. Murojaatingiz administratorga yetkaziladi.');
    return;
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
    save();
  }
  if (!delivery.copied) {
    const copied = await api('copyMessage', { chat_id: state.adminId, from_chat_id: id, message_id: m.message_id });
    state.routes[String(copied.message_id)] = id;
    delivery.copied = true;
    save();
  }
  await say('Murojaatingiz administratorga yuborildi. Javob shu botga keladi.');
}
