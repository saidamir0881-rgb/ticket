import { notFound } from 'next/navigation';
import Link from 'next/link';
import { MapPin, CalendarDays, Banknote, ArrowLeft } from 'lucide-react';
import { getEvent } from '@/lib/events';
import { date, time, money, categoryName } from '@/lib/format';
import SeatPicker from '@/components/site/seat-picker';
export const dynamic = 'force-dynamic';
export default async function EventPage({ params }) {
  const { id } = await params, event = await getEvent(id);
  if (!event) notFound();
  const demo = event.id.startsWith('demo-');
  return <main className="container page-space"><div className="breadcrumb"><Link href="/events"><ArrowLeft size={13} /> Barcha tadbirlar</Link><span>/</span><span>{categoryName(event.category)}</span></div><div className="detail-grid"><div><div className="detail-image" style={{ backgroundImage: `url("${event.poster_url || '/placeholder.svg'}")` }} /><h2>Tadbir haqida</h2><p className="description">{event.description}</p></div><div className="detail-info"><span className="category-label">{categoryName(event.category)}</span><h1>{event.title}</h1>{event.is_demo && <p className="notice">DEMO — xayoliy namuna. Rasmiy tadbir jadvali emas.</p>}<p className="lead"><CalendarDays size={19} />{date(event.starts_at)} · {time(event.starts_at)}</p><p className="lead"><MapPin size={19} />{event.venue?.name}</p><p className="description">{event.venue?.address}</p><div className="panel"><h3>Chipta narxi</h3><p className="price-large">{money(event.min_price)} <small style={{ fontSize: 12, fontWeight: 400 }}>dan</small></p><a className="button" href="#seats">Joy tanlash</a><p className="fine-print"><Banknote size={14} /> To‘lov faqat tadbir kassasida naqd pul bilan. Band qilish muddati — 10 daqiqa.</p></div></div></div><section className="booking-area" id="seats"><span className="eyebrow">ENG YAXSHI JOY — SIZ TANLAGAN JOY</span><h2>Joyingizni tanlang.</h2><SeatPicker eventId={event.id} demo={demo} sport={event.category === 'sport'} /></section></main>;
}
