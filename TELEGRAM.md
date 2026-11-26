# UZTICKET Telegram bot

## Support bot: serverda doimiy ishlash (6-noyabr 2026)

`@uzticket_supportbot` Supabase Edge Function `telegram-support` webhookiga ko‘chirildi. Noutbuk, terminal va sayt brauzerda ochiq turishi shart emas.

Manzil: `https://wbokqbsnnztgekxcysum.supabase.co/functions/v1/telegram-support`.

Webhook Telegramning `X-Telegram-Bot-Api-Secret-Token` sarlavhasini tekshiradi. Bot tokeni va webhook siri Supabase Vault’da shifrlangan. `telegram_support_state` jadvali faqat server uchun: admin ID, eski Reply yo‘nalishlari, yetkazish holati va operator suhbatlari saqlanadi. Bir vaqtdagi so‘rovlar DB lease bilan ajratiladi, qayta kelgan update IDlar takror ishlanmaydi. Xatoda HTTP 503 qaytadi, Telegram qayta urinadi.

Schema manbasi: `supabase/support-bot-schema.sql` (bazaga qo‘llangan). Function manbasi: `supabase/functions/telegram-support/index.ts`, `lib/support-webhook.js` va support kutubxonalari. `supabase/config.toml`da faqat shu webhook uchun JWT tekshiruvi o‘chirilgan; o‘zining maxfiy sarlavha tekshiruvi ishlaydi.

Mahalliy `telegram-support-poll.mjs`ni production bilan birga yoqmang. Polling skripti faol webhookni ko‘rsa o‘zi to‘xtaydi. Eski `.sites-runtime/support-state.json` faqat ko‘chirish paytidagi zaxira; jonli holat endi bazada. `.sites-runtime/support-cloud-secret` mahalliy maxfiy nusxa, Git’ga kiritilmaydi.

Tekshiruv: `node --test tests/support-webhook.test.mjs tests/telegram-support.test.mjs tests/telegram.test.mjs`.

Bot: https://t.me/uzticket_uzbot

Buyruqlar: `/start`, `/events`, `/account`, `/points`, `/help`. Tugmalar saytni Telegram ichida Mini App sifatida ochadi. Buyurtma va chiptalar uchun mavjud sayt hisobi bilan kiriladi. Telegram foydalanuvchi ID orqali avtomatik kirish yo‘q.

`.env.local` fayliga `TELEGRAM_BOT_TOKEN` va `TELEGRAM_APP_URL=https://ticket-997e.vercel.app` kiriting. Tokenni Git yoki chatga yubormang.

```powershell
node --env-file=.env.local scripts/telegram-poll.mjs
```

Bot long polling orqali ishlaydi, alohida ochiq port yoki Vercel muhiti talab qilinmaydi. Bir vaqtning o‘zida faqat bitta nusxani ishlating. Kompyuter o‘chsa yoki jarayon to‘xtasa bot javob bermaydi; doimiy ishlash uchun Node.js serverida shu buyruqni xizmat sifatida ishga tushirish kerak. Faol webhook bo‘lsa, skript uni o‘zi o‘chirmaydi.

Tekshiruv: `node --test tests/telegram.test.mjs`.

## Yordam boti

Quyidagi polling ko‘rsatmalari mahalliy/zaxira rejim uchun. Production yuqoridagi webhook orqali ishlaydi.

`@uzticket_supportbot`: `.env.local` ichida `TELEGRAM_SUPPORT_BOT_TOKEN` belgilanadi. Ishga tushirish: `node --env-file=.env.local scripts/telegram-support-poll.mjs`.

`@Saidagzamov_7` birinchi xabar yuborganda Telegram bergan raqamli ID administrator sifatida saqlanadi. Keyinchalik username o‘zgarishi adminni almashtirmaydi. Mijoz murojaati administratorga nusxalanadi; admin sarlavha yoki nusxalangan xabarga Reply qiladi. Javob mijozga bot nomidan yetkaziladi. Matn, rasm, hujjat va ovozli xabarlar qo‘llanadi.

`.sites-runtime/support-state.json` mahalliy maxfiy holat: admin ID, xabar yo‘nalishlari va polling offset. Uni saqlang, Git’ga qo‘shmang; boshqa serverga ko‘chirganda shu holatni ham xavfsiz ko‘chiring. Jarayonning faqat bitta nusxasi ishlasin. Kompyuter o‘chsa bot to‘xtaydi.
