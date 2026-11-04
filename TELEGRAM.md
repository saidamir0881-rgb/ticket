# UZTICKET Telegram bot

Bot: https://t.me/uzticket_uzbot

Buyruqlar: `/start`, `/events`, `/account`, `/points`, `/help`. Tugmalar saytni Telegram ichida Mini App sifatida ochadi. Buyurtma va chiptalar uchun mavjud sayt hisobi bilan kiriladi. Telegram foydalanuvchi ID orqali avtomatik kirish yo‘q.

`.env.local` fayliga `TELEGRAM_BOT_TOKEN` va `TELEGRAM_APP_URL=https://ticket-997e.vercel.app` kiriting. Tokenni Git yoki chatga yubormang.

```powershell
node --env-file=.env.local scripts/telegram-poll.mjs
```

Bot long polling orqali ishlaydi, alohida ochiq port yoki Vercel muhiti talab qilinmaydi. Bir vaqtning o‘zida faqat bitta nusxani ishlating. Kompyuter o‘chsa yoki jarayon to‘xtasa bot javob bermaydi; doimiy ishlash uchun Node.js serverida shu buyruqni xizmat sifatida ishga tushirish kerak. Faol webhook bo‘lsa, skript uni o‘zi o‘chirmaydi.

Tekshiruv: `node --test tests/telegram.test.mjs`.
