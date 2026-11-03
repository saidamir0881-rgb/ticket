export const money = value => new Intl.NumberFormat('en-US').format(Number(value || 0)).replace(/,/g, ' ') + ' so‘m';
const months = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
export function date(value) {
  // Explicit Uzbek labels avoid different ICU locale coverage in Node and Chrome.
  const parts = new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'numeric', timeZone:'Asia/Tashkent' }).formatToParts(new Date(value));
  return `${Number(parts.find(p=>p.type==='day').value)}-${months[Number(parts.find(p=>p.type==='month').value)-1]}`;
}
export const time = value => new Intl.DateTimeFormat('en-GB', { hour:'2-digit', minute:'2-digit', hourCycle:'h23', timeZone:'Asia/Tashkent' }).format(new Date(value));
export const categories = [
  { id: 'all', name: 'Barchasi', icon: 'Sparkles' },
  { id: 'concert', name: 'Konsertlar', icon: 'Music2' },
  { id: 'theatre', name: 'Teatr', icon: 'Drama' },
  { id: 'sport', name: 'Sport', icon: 'Trophy' },
  { id: 'comedy', name: 'Stand-up', icon: 'Mic2' },
  { id: 'festival', name: 'Festivallar', icon: 'PartyPopper' },
];
export const categoryName = id => categories.find(c => c.id === id)?.name || id;
export const statusName = id => ({ pending: 'To‘lov kutilmoqda', paid: 'To‘langan', cancelled: 'Bekor qilingan', expired: 'Muddati tugagan' }[id] || id);
