export const supportMenu = {
  keyboard: [[{ text: 'Chipta olish' }, { text: 'Karta orqali to‘lov' }], [{ text: 'Naqd to‘lov' }, { text: 'QR chipta' }], [{ text: 'Administratorga yozish' }]],
  resize_keyboard: true,
};

// Only answer general questions. Personal problems and uncertain requests go to a human.
export function supportAnswer(text) {
  if (typeof text !== 'string') return null;
  const q = text.toLowerCase().replace(/[‘’ʻʼ`]/g, "'").replace(/[?!.,]/g, '').replace(/\s+/g, ' ').trim();
  if (/^(salom|assalomu alaykum|assalom|hello|привет)$/.test(q)) return 'Assalomu alaykum! Men UZTICKET avtomatik yordamchisiman. Chipta olish, karta yoki naqd to‘lov va QR chipta haqida so‘rashingiz mumkin. Operator kerak bo‘lsa, “Administratorga yozish” tugmasini bosing.';
  if (/^(rahmat|katta rahmat|raxmat|спасибо)$/.test(q)) return 'Arzimaydi! Yana savolingiz bo‘lsa yozing. Administrator kerak bo‘lsa, “Administratorga yozish” tugmasini bosing.';
  let answer;
  if (/^(chipta olish|chiptani qanday (olaman|olsam bo'ladi)|qanday chipta (olaman|olsam bo'ladi)|bilet qanday olinadi)$/.test(q)) answer = 'Saytda tadbirni oching, joylarni tanlang, hisobingizga kiring va band qiling. Bitta buyurtmada ko‘pi bilan 8 ta joy tanlanadi. Keyin mavjud to‘lov usulini tanlang.';
  if (/^(karta( orqali)?( to'lov)?|karta orqali qanday to'layman|to'lov qanday qilinadi)$/.test(q)) answer = 'Kabinetda ko‘rsatilgan kartaga bank ilovangizdan pul o‘tkazing va 10 daqiqalik band tugashidan oldin chekni saytdagi buyurtmaga yuklang. Chek yuborilgach tekshirish muddati 24 soat. Admin tushumni tasdiqlagach chipta chiqadi. Botga chek yuborish buyurtmaga chek yuklash o‘rnini bosmaydi.';
  if (/^(naqd( to'lov)?|naqd qanday to'layman|kassa(lar)?( qayerda)?)$/.test(q)) answer = 'Buyurtmada faol to‘lov punktini tanlang. Naqd band 1 soat saqlanadi. Shu muddatda kassada to‘lab, buyurtma raqamini ko‘rsating. Admin tasdiqlagach chipta kabinetda chiqadi. Kassa manzillari saytning “Kassalar” bo‘limida.';
  if (/^(qr( chipta)?|elektron chipta|chiptani qayerdan (olaman|yuklayman)|chipta qayerda)$/.test(q)) answer = 'To‘lov tasdiqlangach shaxsiy kabinetdan QR chiptani PNG rasm sifatida yuklab olasiz. QR havolasini boshqalarga yubormang. Chipta ko‘rinmayotgan bo‘lsa, administratorga yozing.';
  if (/^(bandni qanday bekor qilaman|buyurtmani qanday bekor qilaman|bekor qilish)$/.test(q)) answer = 'To‘lanmagan va cheki yuborilmagan bandni kabinetdan bekor qilish mumkin. Pul o‘tkazilgan yoki chek yuborilgan bo‘lsa, administratorga murojaat qiling.';
  return answer ? `${answer}\n\nBu avtomatik yo‘riqnoma. Muammo hal bo‘lmasa, “Administratorga yozish” tugmasini bosing va savolingizni yozing.` : null;
}
