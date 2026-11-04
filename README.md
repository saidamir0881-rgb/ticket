# UZTICKET

O‘zbek tilidagi tadbir va chipta band qilish platformasi. React, JavaScript, Next.js App Router, Tailwind CSS, Lucide, Zod, Supabase PostgreSQL/Auth/Storage va QRCode ishlatilgan. Sites uchun Next.js bilan mos Vinext build ham mavjud.

## 1. Ishga tushirish

Node.js 22.13 yoki yangiroq versiya kerak. Windows PowerShell siyosati `npm.ps1` ni bloklasa, `npm.cmd` ishlating.

```powershell
cd "C:\Users\User\Desktop\Новая папка\uzticket"
npm.cmd ci
npm.cmd run dev:next
```

Brauzerda terminal ko‘rsatgan `http://localhost:3000` manzilni oching. Sites/Vinext uchun `npm.cmd run dev` ishlatiladi.

```powershell
npm.cmd run build:next
npx.cmd next start
```

## 2. Supabase loyiha va muhit sozlamalari

Supabase Dashboard’da loyiha yarating yoki mavjud loyiha sozlamalarini oching. Project Settings → API / API Keys’dan URL va publishable (yoki legacy anon) kalitni oling. `.env.example` nusxasini `.env.local` deb saqlang:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ham qo‘llanadi va berilgan bo‘lsa ustunlikka ega. Bu checkout uchun yuborilgan URL/public kalit `.env.local` da sozlangan. Hosted build uchun `lib/supabase/config.js` da shu loyihaning ommaviy URL va publishable kaliti fallback sifatida bor; boshqa loyihaga ko‘chirganda env qiymatlarini almashtiring.

Ilova `service_role` kalitini talab qilmaydi: admin ham foydalanuvchi sessiyasi va himoyalangan RPC orqali ishlaydi. `SUPABASE_SERVICE_ROLE_KEY` faqat kelgusida ishonchli server boshqaruvi uchun ajratilgan; uni hech qachon `NEXT_PUBLIC_*`ga qo‘ymang va brauzerga uzatmang. Muhit o‘zgargach serverni qayta ishga tushiring.

## 3. Bazani yaratish — zarur qadam

Ommaviy kalit jadval yaratish vakolatini bermaydi. Supabase SQL Editor’da quyidagi fayllarni tartib bilan ishga tushiring:

1. `supabase/migrations/202611030001_uzticket.sql` — barcha jadvallar, RLS, RPC va Storage bucketlari. Bir marta ishlating; yangi sxema uchun mo‘ljallangan.
2. `supabase/seed.sql` — to‘rtta manzil, beshta aniq DEMO belgili tadbir, har biri uchun 240 ta mustaqil joy. Ixtiyoriy, qayta ishlatish mumkin.
3. Dashboard → Database → Extensions’da `pg_cron`ni yoqing, keyin `supabase/migrations/202611030002_expiry_schedule.sql`ni bajaring. Muddati tugagan bandlarni har daqiqada tozalaydi.

Supabase CLI orqali muqobil yo‘l:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
# seed.sql ni SQL Editor’da bajaring yoki o‘zingizning CLI seed jarayoningizga qo‘shing.
```

Cron bo‘lmasa ham eski joylar xaritada bo‘sh deb ko‘rinadi va keyingi band/to‘lov tranzaksiyasi eski bandni tozalaydi. Eski buyurtmani to‘lash mumkin emas. Cron faqat saqlangan holatlarni muntazam yangilaydi.

Bazaga ulanishda xato bo‘lsa bosh sahifa aniq belgilangan xayoliy namunalarga o‘tadi. `demo-*` URL’laridagi joy xaritasida haqiqiy buyurtma yaratilmaydi. Seed bilan yaratilgan DEMO tadbirlar esa bazadagi to‘liq jarayonni sinash uchun ishlaydi; ular rasmiy tadbirlar emas.

## 4. Auth sozlamalari

Authentication → URL Configuration:

- Mahalliy Site URL: `http://localhost:3000`.
- Redirect URL: `http://localhost:3000/auth/callback`.
- Vinext porti boshqacha bo‘lsa, o‘sha portdagi `/auth/callback`ni ham qo‘shing.
- Hosted Site URL: `https://uzticket-tashkent.sappycob2.chatgpt.site`.
- Hosted redirect: `https://uzticket-tashkent.sappycob2.chatgpt.site/auth/callback`.
- Parol tiklash yo‘li uchun `/auth/callback?next=/reset-password?update=1` redirectini ham ro‘yxatga qo‘shing yoki development uchun cheklangan origin wildcardidan foydalaning.

Email/password provayderini yoqing. Email tasdig‘i yoqilgan bo‘lsa, xatdagi havola orqali tasdiqlang. Tijoriy foydalanish uchun Auth SMTP va rate-limit sozlamalarini sozlang. Saytning xususiy Sites kirish chegarasi saqlanadi; uning ichidagi mijozlar hisobi Supabase Auth bilan ishlaydi.

## 5. Bitta admin yaratish

Authentication → Users → Add user orqali administratorning haqiqiy Gmail manzili va kuchli paroli bilan akkaunt yarating. Parolni kodga yozmang. `profiles` avtomatik yaratiladi.

Users bo‘limidan o‘sha akkauntning UUID qiymatini nusxalang. Faqat ishonchli SQL Editor’da quyidagini bajaring:

```sql
update public.profiles
set role = 'admin'
where id = 'ADMIN_AUTH_USER_UUID';
```

`only_one_admin` unique indeksi ikkinchi admin tayinlashga yo‘l qo‘ymaydi. Oddiy mijoz `role` ustuniga yozish vakolatiga ega emas, signup metadata ham admin yaratmaydi. Adminni almashtirish kerak bo‘lsa, ishonchli SQL Editor’da eski rolni `customer`ga tushirib, yangisini bitta tranzaksiyada belgilang.

Admin va mijozlar asosiy saytdagi /login formasidan kiradi. Server profildagi rolni tekshiradi: admin /admin ga, mijoz /account ga yonaltiriladi. Eski /admin-login manzili /login ga otadi. Admin vakolati faqat Supabase bazasida beriladi.

## 6. Ishlaydigan jarayonlar

- `/` — tanlangan tadbir, qidiruv, turkum filtri, tadbir va manzil kartalari.
- `/events` — katalog, sana/narx bo‘yicha saralash, bo‘sh natija holati.
- `/events/[id]` — tadbir, sport maydoni/sahna, narxlar, rangli joy xaritasi. Mavjudlik har 15 soniyada yangilanadi.
- `/login`, `/register`, `/reset-password` — haqiqiy Supabase Auth.
- `/account` - profil, buyurtmalar, karta cheki, punkt xaritasi, 1 soat / 24 soat hisoblagichi va avtomatik QR.
- `/admin` — oltita bazadan hisoblangan ko‘rsatkich.
- `/admin-login` - eski havolalar uchun umumiy `/login` sahifasiga redirect.
- `/admin/events` — yaratish/tahrirlash/o‘chirish, status, poster yuklash, har bir joy narxi va VIP turkumi.
- `/admin/venues` — manzillar, qatorlar soni, qator nomi, har qatordagi joylar soni, narx va turkum shabloni.
- `/admin/bookings` — mijoz ma’lumotlari, joylar, buyurtma raqami, naqd to‘lovni tasdiqlash, to‘lanmagan bandni bekor qilish.
- `/admin/tickets` — chiptalar ro‘yxati, QR token tekshirish va atomar bir martalik kirish qaydi. QR skaneri tokenni matn maydoniga kiritishi mumkin. Kamera skaneri kiritilmagan.
- Admin ro‘yxatlari 50 tadan sahifalanadi. Qidiruv joriy sahifadagi yozuvlar bo‘yicha ishlaydi.

Manzil shabloni mavjud tadbirlarning joylarini o‘zgartirmaydi. Yangi tadbir yaratilganda shablon tranzaksiyada ko‘chiriladi; mavjud tadbir uchun narx/turkumni “Joylar”dan sozlang. Buyurtmali tadbirlar va joylar FK orqali o‘chirishdan himoyalangan.

## 7. Karta otkazmasi, naqd punktlar va QR

Mavjud bazaga tartib bilan quyidagilarni bir marta qollang:

1. supabase/migrations/202611030004_checkout_points.sql
2. supabase/migrations/202611030005_card_receipt_review.sql

Bitta birlashtirilgan nusxa: UZTICKET-payments-update.sql. Eski migratsiyalarni boshidan qayta bajarmang.

Admin /admin/points sahifasida qabul qiluvchi karta raqami, egasi va bankni kiritib karta usulini yoqadi. Bu rekvizitlar mijozga pul otkazish uchun korsatiladi. Karta orqali avtomatik pul yechilmaydi, bankka ulanish yoki haqiqiy karta tokenizatsiyasi mavjud emas. Mijoz toliq karta raqami va CVV saqlanmaydi; ixtiyoriy oxirgi 4 raqami olinadi.

Karta usuli: joylar dastlab 10 daqiqa saqlanadi. Mijoz bank ilovasidan rekvizitga pul otkazib, JPG/PNG/PDF chekni (5 MB gacha) yuklaydi. Yuklashdan keyin band 24 soatga uzayadi va tolov review holatiga otadi. Shu paytda chipta berilmaydi. Admin bankdagi tushumni tekshirgach /admin/bookings ichida chekni tasdiqlaydi yoki sabab bilan rad etadi. Tasdiqda QR chiptalar bitta baza tranzaksiyasida yaratiladi. Rad etishda joylar boshatiladi. Eski soxta karta endpointi yopilgan.

Naqd usuli: mijoz punktni tanlaydi va joylar 1 soatga band qilinadi. Pulni punktda qabul qilgach admin tasdiqlaydi. Keyin QR avtomatik chiqadi. 30 ta boshlangich nuqta faqat namuna: koordinatalar taxminiy, haqiqiy manzillar emas va haqiqiy mijozlar uchun yopiq. Faqat demo tadbirlarda namuna tanlovni sinash mumkin. Admin real manzil, koordinata, ish vaqti va telefonni tekshirib, namuna belgisini olib, punktni faollashtiradi. Haqiqiy kassalarni tekshirmasdan faollashtirmang.

Cheklar private payment-receipts bucketida; faqat egasi va admin oqiy oladi. Admin uchun chek havolasi 2 daqiqaga imzolanadi. Qayta yuklash/ochirish mijozga berilmagan. Chek yuborilgan buyurtmani mijoz bekor qila olmaydi: admin qarori kerak. Muddati tugagan otkazmada pul avtomatik qaytmaydi, uni kassaviy tartibda tekshirish kerak.

Kabinet faol bandlarni har 3 soniyada kuzatadi. Admin tasdigidan keyin bilet va QR sahifani qolda yangilamasdan chiqadi. Kechikkan eski javob tolov yoki chek holatini orqaga qaytarmaydi. Yangi migratsiyalargacha eski kabinet ma'lumotlari moslik rejimida ochiladi.

## 8. Tekshirish

```powershell
npm.cmd run test:db
npm.cmd run build:next
npm.cmd run build
```

DB testlari haqiqiy PostgreSQL dvigateli PGlite’da migratsiyani bajaradi: role escalation, admin-only RLS, storage ruxsati, unique faol band, narx snapshoti, egaga xos o‘qish, naqd tasdiq idempotentligi, bir martalik QR, expiry va cancellation. Testda Supabase auth/storage atrofidagi minimal sxema va pgcrypto randomness o‘rniga test generatori qo‘yiladi. Production migratsiyasida pgcrypto ishlaydi.

PGlite bitta ulanish bilan ishlaydi; ushbu test real Supabase’dagi ko‘p ulanishli yuk testining o‘rnini bosmaydi. Production ishga tushirishdan oldin ikkita mijoz bilan bitta joyni bir vaqtda band qilish va kassadagi to‘liq jarayonni alohida Supabase test loyihasida sinang.

## Rasmiy katalog — 4-noyabr 2026

`lib/data/official-events.json` iTicket.uz ochiq katalogidan tekshirilgan 50 ta tadbirni saqlaydi: nom, seans boshlanishi, narx chegaralari, poster, manzil va rasmiy xarid havolasi. Posterlar manbaning CDN havolalari orqali ko‘rsatiladi. Qisqa jadval va narxlar o‘zgarishi mumkin; mavjud chipta soni tekshirish paytidagi holat, zal sig‘imi emas. Xarid rasmiy sotuvchida bajariladi; bu tadbirlar uchun mahalliy joy, band yoki chipta yaratilmaydi. Katalog ishlashi SQL importiga bog‘liq emas.

Supabase SQL Editor’da **faqat yangi** `UZTICKET-official-catalog.sql` faylini bir marta bajaring (ikki yangi migratsiya birlashtirilgan). Oldingi SQL fayllarini qayta bajarmang. Yangi fayl eski namunaviy tadbirlarni draft holatiga o‘tkazadi, buyurtma va chiptalarni saqlaydi, 50 ta tashqi tadbirni joylar yaratmasdan import qiladi va `public_ticket` funksiyasini o‘rnatadi. SQL bu repodan avtomatik bazaga bajarilmaydi.

Kabinetdagi chipta to‘liq PNG rasm va QR bilan beriladi. QR `/tickets/<256-bit-token>` sahifasini ochadi. Sahifani ochish kirishda foydalanish holatini o‘zgartirmaydi; buni admin tekshiruvi bajaradi. Ochiq javobda mijozning shaxsiy ma’lumotlari yo‘q. Arxivdagi namuna chiptalar kirish uchun yaroqsiz deb belgilanadi. Tashqi katalog uchun haqiqiy chiptani sotuvchi chiqaradi.

Yangi migratsiya testi: `node --test tests/official-catalog.test.mjs`.

### Ajratilgan joylarni sotuvga chiqarish

Egasi har bir tadbir uchun 100 ta joy ajratilganini bildirdi. `UZTICKET-enable-booking.sql` faylini Supabase SQL Editor’da bajaring: avval import qilingan 50 tadbir mahalliy sotuvga o‘tadi, har biriga 10 qator × 10 joy yaratiladi. 1-qator 1 000 000, 2-qator 900 000, …, 10-qator 100 000 so‘m. Jami 5 000 joy. Bu faylni takror bajarish joylarni ko‘paytirmaydi; avvalgi buyurtma narxlari booking_seats snapshotida saqlanadi. Dastlabki katalog SQL’ini qayta bajarmang: u tadbirlarni yana tashqi katalog holatiga o‘tkazadi.

Frontend bazadagi inventory_mode=local holatini o‘qigach joy tanlashni ochadi. SQL bajarilmaguncha tashqi katalog rejimi saqlanadi. To‘lov mavjud karta cheki/admin tasdig‘i yoki faol punktda naqd tartibida. To‘lov tasdiqlangach chipta va QR kabinetda avtomatik chiqadi. Boshlangan tadbirlar uchun yangi buyurtma serverda yopiladi.

**Yangilangan narx talabi:** oldingi yagona 100 ming–1 mln oralig‘i o‘rniga har tadbirning manbadagi min/max narxi ishlatiladi. 4-noyabrda 50 ta narx qayta tekshirildi. 10-qator boshlang‘ich narxda, 1-qator maksimal narxda, oraliq qatorlar chiziqli taqsimlanib ming so‘mgacha yaxlitlanadi. `UZTICKET-enable-booking.sql` endi joylarni ochish va yangi narx migratsiyasini birlashtiradi; avvalgi bandlarning narx snapshotlari o‘zgarmaydi. Import qilingan tadbirlarda tashqi xarid tugmasi olib tashlangan; faqat bazadagi haqiqiy joylar tanlanadi. Bo‘sh inventar holati ochiq xabar bilan ko‘rsatiladi.

### Karta oynasi va kassalar xaritasi

Karta oynasida qolgan band vaqti, nusxalanadigan summa va rekvizitlar, chek rasmi previewsi va o‘tkazma bajarilganini tasdiqlash mavjud. Yuborish xatosidan keyingi takroriy urinish oldin yuklangan chek faylini qayta ishlatadi. Muddat tugaganda yangi chek yuborish yopiladi; server muddatni mustaqil tekshiradi. Bu qo‘lda o‘tkazma jarayoni, bank kartasidan avtomatik pul yechilmaydi.

`/points` sahifasi 4-noyabrda `https://iticket.uz/ru/point-of-sales` manbasidan tekshirilgan 5 ta kassani ko‘rsatadi (4 Toshkent, 1 Samarqand). Tashqi kassalar UZTICKET kassasi deb qayta nomlanmagan va to‘lov punktlariga import qilinmagan. UZTICKET buyurtmalarini qabul qilish bo‘yicha kelishuv tasdiqlanmagan. Checkout API faqat faol, namuna bo‘lmagan `cash_points` yozuvlarini beradi; manba katalogi naqd to‘lov tanloviga qo‘shilmaydi. Ushbu UI yangilanishiga SQL kerak emas.
