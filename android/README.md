# UZTICKET Android

Android 8+ uchun mavjud HTTPS saytni ochadigan native WebView ilova. Login, tadbirlar, buyurtmalar, chek faylini tanlash, ortga qaytish, internet xatosida qayta urinish va Telegram yordam tugmasi mavjud. Tashqi havolalar mos tashqi ilovada ochiladi. Internet kerak.

Chipta PNG va kalendar faylini yuklab olish uchun yuqoridagi ↗ tugmasi orqali sahifani brauzerda oching. Eng yaqin kassa geolokatsiyasi ham brauzerda ishlatiladi. Ilova joylashuv, kamera yoki umumiy xotira ruxsatini so‘ramaydi.

GitHub → Actions → Android APK → muvaffaqiyatli run → Artifacts → UZTICKET-Android-APK. ZIP ichidagi app-debug.apk o‘rnatiladi. Bu sinov imzosi bilan yig‘ilgan APK; Play Store uchun alohida doimiy release kaliti kerak. Tokenlar APK ichiga kiritilmaydi.

Mahalliy yig‘ish: JDK 17, Android SDK 35 va Gradle 8.11.1 o‘rnating, `gradle -p android assembleDebug` bajaring. Natija `android/app/build/outputs/apk/debug/app-debug.apk`.
