# UzTicket Telegram OTP

Ro‘yxatdan o‘tishda telefon raqami Telegram bot orqali tasdiqlanadi. Lokal testda sessiyalar process xotirasida, Vercel’da esa mavjud Supabase’dagi vaqtinchalik 	elegram_otp_sessions jadvalida saqlanadi. OTP va Start tokenining HMAC-SHA256 xeshi saqlanadi; OTP 5 daqiqada eskiradi. Akkaunt Supabase Auth’da, ism va telefon profiles jadvalida saqlanadi. Yangi database yaratilmaydi.

## Bot va muhit sozlamalari

1. BotFather’da alohida OTP bot yarating. Saytdagi mavjud yordam botining tokenini qayta ishlatmang.
2. `.env.local` faylga quyidagilarni kiriting. `SUPABASE_SERVICE_ROLE_KEY` loyihada allaqachon ishlatiladigan server kalitidir; brauzerga yoki repoga joylamang.

```dotenv
TELEGRAM_OTP_BOT_TOKEN=BotFather_bergan_token
TELEGRAM_OTP_BOT_USERNAME=bot_username
TELEGRAM_OTP_WEBHOOK_SECRET=uzun_random_secret_32_belgidan_kam_emas
TELEGRAM_OTP_HASH_SECRET=boshqa_uzun_random_secret_32_belgidan_kam_emas
TELEGRAM_OTP_WEBHOOK_URL=https://ommaviy-https-manzil/api/telegram/otp-webhook
SUPABASE_SERVICE_ROLE_KEY=Supabase_server_service_role_key
```

Ikki secret uchun bir xil qiymat ishlatmang. Secret yaratish uchun PowerShell’da:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Bot username’ni `@` belgisiz yozing. Tokenlarni `.env.example` yoki boshqa git fayllarga kiritmang.

## Webhook ulash va ishga tushirish

Telegram webhook uchun ommaga ochiq HTTPS manzil kerak. Local sinovda Next.js’ni ishga tushiring, so‘ng HTTPS tunnel (masalan, ngrok yoki Cloudflare Tunnel) ochib chiqqan URL’ni `TELEGRAM_OTP_WEBHOOK_URL` ga yozing.

```powershell
npm.cmd run dev
npm.cmd run bot:otp:webhook
```

`bot:otp:webhook` bot username’ni token bilan solishtiradi, webhook’ni `setWebhook` orqali ulaydi va webhook holatini tekshiradi. Botga ayni vaqtda `getUpdates` polling ishlatmang.

Deploydan oldin Supabase SQL Editor’da supabase/migrations/202611260001_telegram_otp.sql faylini bir marta ishga tushiring. Vercel Project → Settings → Environment Variables’da Production uchun TELEGRAM_OTP_BOT_TOKEN, TELEGRAM_OTP_BOT_USERNAME, TELEGRAM_OTP_WEBHOOK_SECRET, TELEGRAM_OTP_HASH_SECRET, TELEGRAM_OTP_WEBHOOK_URL va SUPABASE_SERVICE_ROLE_KEY bo‘lishi kerak. Webhook URL https://<sayt-domeni>/api/telegram/otp-webhook bo‘lsin. Env qiymatlarini o‘zgartirgach qayta deploy qiling. Tokenni .env.localdan Vercel’ga kiriting, GitHub’ga qo‘shmang.

## Tekshirish

```powershell
npm.cmd run test:telegram-otp
npm.cmd run lint
```

Saytda `/register` ni ochib telefon raqamingizni kiriting, Telegram bot havolasini bosing va Start qiling. Botdagi “Telefon raqamimni ulashish” tugmasini bosing, kelgan kodni saytda kiriting. Tasdiqdan keyin ism, familiya va parol bilan akkaunt ochiladi.

## Saqlash va xavfsizlik

Vercel’da handlerlar avtomatik ravishda Supabase store’dan foydalanadi. Sessiya jadvali RLS bilan yopilgan va faqat service_role foydalanadi; OTP va Start tokenining hash qiymati saqlanadi. Rate limit serverlar orasida ham umumiy. Lokal testda migration talab qilinmaydi va memory store ishlaydi.

Supabase Auth’da telefon va parol bilan kirish yoqilgan bo‘lishi kerak. Server telefon Telegram’da tasdiqlangach Supabase Admin API orqali `phone_confirm: true` bilan foydalanuvchi yaratadi; mavjud Auth trigger `profiles` yozuvini ochadi. Rasmiy qo‘llanmalar: [Telegram Bot API](https://core.telegram.org/bots/api) va [Supabase Auth Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser).
