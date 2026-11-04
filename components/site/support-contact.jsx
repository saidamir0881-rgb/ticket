import { MessageCircle } from 'lucide-react';
import { supportUrl } from '@/lib/support';

export default function SupportContact() {
  if (!supportUrl) return null;
  return <section id="contact" style={{ padding: '24px', border: '1px solid #e5ddff', borderRadius: '20px', margin: '24px 0', background: '#faf8ff', scrollMarginTop: '120px' }}>
    <h2>Muammo yuz berdimi?</h2>
    <p>To‘lov, buyurtma yoki chipta bo‘yicha administratorga Telegram orqali yozing. Muammoni qisqacha tushuntiring va buyurtma raqamingizni ko‘rsating.</p>
    <a href={supportUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '14px 20px', borderRadius: '12px', background: '#703cff', color: '#fff', fontWeight: 700, textDecoration: 'none' }}><MessageCircle size={20} /> Telegram’da adminga yozish</a>
    <p style={{ fontSize: '14px' }}>Parol, karta PIN-kodi, SMS-kod yoki chiptaning QR kodini yubormang.</p>
  </section>;
}
