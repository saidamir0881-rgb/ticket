// Only these fictional fixtures are accepted. Never store a PAN, expiry or CVV.
export const demoCards = [
  {number:'4242 4242 4242 4242',code:'success',name:'Muvaffaqiyatli test karta'},
  {number:'4000 0000 0000 0002',code:'declined',name:'Rad etiladigan test karta'},
];
export function demoCardCode(number) {
  const normalized=String(number).replace(/\s/g,'');
  return demoCards.find(card=>card.number.replace(/\s/g,'')===normalized)?.code || null;
}
