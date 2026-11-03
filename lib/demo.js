// Fictional fixtures used only when the database is not provisioned. Never bookable.
export const demoVenues = [
  { id: 'demo-v1', name: 'Humo Arena', address: 'Toshkent, Afrosiyob ko‘chasi', city: 'Toshkent', type: 'arena', image_url: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900&auto=format&fit=crop&q=85' },
  { id: 'demo-v2', name: 'Bunyodkor stadioni', address: 'Toshkent, Bunyodkor shohko‘chasi', city: 'Toshkent', type: 'stadium', image_url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&auto=format&fit=crop&q=85' },
  { id: 'demo-v3', name: 'O‘zbek Milliy teatri', address: 'Toshkent, Alisher Navoiy ko‘chasi', city: 'Toshkent', type: 'theatre', image_url: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=900&auto=format&fit=crop&q=85' },
  { id: 'demo-v4', name: 'Toshkent konsert zali', address: 'Toshkent shahri', city: 'Toshkent', type: 'hall', image_url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&auto=format&fit=crop&q=85' },
];
const base = { status: 'published', is_demo: true, description: 'Bu namoyish uchun yaratilgan xayoliy tadbir. Rasmiy e’lon yoki haqiqiy konsert jadvali emas. Yaqinlaringiz bilan unutilmas oqshomni tasavvur qiling.', featured: true };
export const demoEvents = [
  { ...base, id: 'demo-1', title: 'Musiqa bilan birga yashang', subtitle: 'CONCERT 2026', category: 'concert', starts_at: '2026-12-12T14:00:00Z', min_price: 150000, venue: demoVenues[0], poster_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&auto=format&fit=crop&q=90' },
  { ...base, id: 'demo-2', title: 'Katta futbol oqshomi', category: 'sport', starts_at: '2026-12-14T13:00:00Z', min_price: 100000, venue: demoVenues[1], poster_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=85' },
  { ...base, id: 'demo-3', title: 'Sahna sehriga sayohat', category: 'theatre', starts_at: '2026-12-16T14:00:00Z', min_price: 80000, venue: demoVenues[2], poster_url: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=85' },
  { ...base, id: 'demo-4', title: 'Stand Up: kulgi kechasi', category: 'comedy', starts_at: '2026-12-18T14:00:00Z', min_price: 120000, venue: demoVenues[3], poster_url: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&auto=format&fit=crop&q=85' },
  { ...base, id: 'demo-5', title: 'Music Festival 2026', category: 'festival', starts_at: '2026-12-20T12:00:00Z', min_price: 200000, venue: demoVenues[0], poster_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900&auto=format&fit=crop&q=85' },
];
