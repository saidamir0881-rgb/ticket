# UzTicket Telegram OTP

Telefon raqami Telegram bot orqali tasdiqlanadi. Lokal testda OTP sessiyasi process xotirasida, Vercel’da esa mavjud Supabase’dagi `telegram_otp_sessions` jadvalida saqlanadi. OTP va Start tokenining HMAC-SHA256 xeshi yoziladi, OTP 5 daqiqada eskiradi. Akkaunt Supabase Auth’da saqlanadi. Telegram chat identifikatori `app_metadata` ichida AES-GCM bilan shifrlanadi; yangi jadval yoki database kerak emas.

## Sozlash

`.env.local`da quyidagi kalitlar bo‘lsin. `SUPABASE_SERVICE_ROLE_KEY` faqat serverda ishlatiladi, repoga yoki brauzerga qo‘shilmaydi.

```dotenv
TELEGRAM_OTP_BOT_TOKEN=BotFather_tokeni
TELEGRAM_OTP_BOT_USERNAME=bot_username
TELEGRAM_OTP_WEBHOOK_SECRET=kamida_32_belgilik_secret
TELEGRAM_OTP_HASH_SECRET=boshqa_32_belgilik_secret
TELEGRAM_OTP_WEBHOOK_URL=https://sayt-domeni/api/telegram/otp-webhook
SUPABASE_SERVICE_ROLE_KEY=Supabase_server_kaliti
```

Webhook secret va hash secret alohida bo‘lsin. Bot username’ni `@` belgisiz yozing.

## Deploy va bot menyusi

1. Supabase SQL Editor’da `supabase/migrations/202611260001_telegram_otp.sql` faylini bir marta ishga tushiring.
2. Vercel Production env’da yuqoridagi Telegram kalitlarini hamda `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` va `SUPABASE_SERVICE_ROLE_KEY` borligini tekshiring.
3. `TELEGRAM_OTP_WEBHOOK_URL`ni `https://<sayt-domeni>/api/telegram/otp-webhook` qilib qo‘ying va env o‘zgargach Production’ni qayta deploy qiling.
4. `.env.local`dagi mos qiymatlar bilan `npm.cmd run bot:otp:webhook`ni ishga tushirib bot webhook’ini ulang.

Botga `/start account` yuborilganda `Parolni tiklash` va `Ro‘yxatdan o‘tish` tugmalari chiqadi. Kirish sahifasidagi parolni unutish havolasi botni ochadi. Kirish va parol tiklash telefon hamda Telegram OTP orqali ishlaydi, email talab qilinmaydi.

Ro‘yxatdan o‘tishda Telegram chat identifikatori xavfsiz saqlanadi. Keyingi kirishda telefon va parol to‘g‘ri bo‘lsa OTP shu bot chatiga bevosita yuboriladi. Avvaldan ochilgan akkauntlarda bog‘lanish bo‘lmasa, ilk kirishda bot orqali kontaktni bir marta ulash so‘raladi; muvaffaqiyatli tasdiqdan keyin keyingi kodlar avtomatik yuboriladi.

Parol tiklashda raqam Telegram Contact Sharing va OTP bilan tasdiqlangach, yangi parol o‘rnatiladi.

## Tekshirish

```powershell
npm.cmd run test:telegram-otp
npm.cmd run lint
```