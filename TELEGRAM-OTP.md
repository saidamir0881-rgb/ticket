# UzTicket Telegram OTP

Telefon Telegram bot orqali tasdiqlanadi. Lokal testda OTP sessiyalari process xotirasida saqlanadi; Vercel’da esa mavjud Supabase loyihadagi vaqtinchalik `telegram_otp_sessions` jadvali ishlatiladi. OTP va Start tokenining HMAC-SHA256 xeshi saqlanadi. OTP 5 daqiqada eskiradi. Akkaunt Supabase Auth’da, profil `profiles` jadvalida yoziladi. Yangi database yaratilmaydi.

## Sozlash

1. BotFather’da alohida OTP bot yarating. Mavjud yordam botining tokenini ishlatmang.
2. `.env.local`da quyidagi qiymatlar bo‘lsin. `SUPABASE_SERVICE_ROLE_KEY` server kalitidir; uni GitHub’ga qo‘shmang.

```dotenv
TELEGRAM_OTP_BOT_TOKEN=BotFather_tokeni
TELEGRAM_OTP_BOT_USERNAME=bot_username
TELEGRAM_OTP_WEBHOOK_SECRET=kamida_32_belgilik_secret
TELEGRAM_OTP_HASH_SECRET=boshqa_32_belgilik_secret
TELEGRAM_OTP_WEBHOOK_URL=https://sayt-domeni/api/telegram/otp-webhook
SUPABASE_SERVICE_ROLE_KEY=Supabase_server_kaliti
```

Secret’larni takror ishlatmang. Bot username’ni `@` belgisiz yozing.

## Vercel deploy va ulash

1. Supabase SQL Editor’da `supabase/migrations/202611260001_telegram_otp.sql` faylini bir marta ishga tushiring.
2. Vercel Project → Settings → Environment Variables → Production’da `TELEGRAM_OTP_BOT_TOKEN`, `TELEGRAM_OTP_BOT_USERNAME`, `TELEGRAM_OTP_WEBHOOK_SECRET`, `TELEGRAM_OTP_HASH_SECRET`, `TELEGRAM_OTP_WEBHOOK_URL` va `SUPABASE_SERVICE_ROLE_KEY` kiriting. Webhook URL `https://<sayt-domeni>/api/telegram/otp-webhook` ko‘rinishida bo‘lsin.
3. Env’lar o‘zgargach Production’ni qayta deploy qiling.
4. `.env.local`dagi mos qiymatlar va URL tayyor bo‘lgach `npm.cmd run bot:otp:webhook` buyrug‘ini ishga tushiring. Skript bot tokenini tekshiradi, `setWebhook` chaqiradi va natijani tasdiqlaydi. Botda polling ishlatmang.

Lokal HTTPS tunnel bilan sinash mumkin. Tunnel lokal Next.js ilovasining barcha yo‘llarini internetga ochishini yodda tuting.

## Tekshirish

```powershell
npm.cmd run test:telegram-otp
npm.cmd run lint
```

`/register` sahifasida telefonni yuboring, bot havolasini ochib Start bosing, o‘z raqamingizni Contact Sharing orqali ulashing va bot yuborgan kodni kiriting. Keyin ism, familiya va parol bilan akkaunt yarating.

Vercel’da sessiyalar va rate limit mavjud Supabase’da saqlanadi. Jadval RLS bilan yopiq, faqat `service_role` foydalanadi. Lokal testda migration kerak emas; xotira store’i ishlaydi. Supabase Auth’da telefon/parol orqali kirish yoqilgan bo‘lishi lozim.