# Hamyon API sozlash

1. Supabase SQL Editor'da `supabase/migrations/202611250001_hamyon_payments.sql` migratsiyasini bajaring.
2. Deploy muhitingizda `HAMYON_SHOP_ID`, yangilangan `HAMYON_SHOP_KEY` va `SUPABASE_SERVICE_ROLE_KEY` ni server-only environment secret qilib kiriting. `NEXT_PUBLIC_` prefiksini ishlatmang.
3. Hamyon do‘kon sozlamalariga quyidagi ommaviy HTTPS callback manzillarini kiriting (`<sayt-domeni>` o‘rniga production domen):
   - Prepare: `https://<sayt-domeni>/api/payments/hamyon/prepare`
   - Complete: `https://<sayt-domeni>/api/payments/hamyon/complete`
4. `payment_settings` ichida karta to‘lovi yoqilgan bo‘lishi kerak; bu mavjud checkout sozlamasi karta usulini ko‘rsatadi.

Sayt checkout paytida Hamyon'da to‘lov yaratadi. Bir xil summa bilan parallel to‘lov chekloviga duch kelmaslik uchun tizim band summani tekshiradi va zarur bo‘lsa summaga 1–99 so‘m qo‘shadi; kabinetda o‘tkazilishi kerak bo‘lgan aniq summa chiqadi. `complete` callback imzosi tekshiriladi, `paid` holatida baza tranzaksiya ichida buyurtmani tasdiqlab, biletlarni bir marta yaratadi.
