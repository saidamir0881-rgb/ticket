import { listEvents } from '@/lib/events';
import Catalog from '@/components/site/catalog';
import { CalendarDays, Heart } from 'lucide-react';
export const metadata = { title: 'Barcha tadbirlar' };
export const dynamic = 'force-dynamic';
export default async function Events({ searchParams }) {
  const { events } = await listEvents();
  const params = await searchParams;
  return <main className="container page-space events-page"><div className="events-page-heading"><div><span className="eyebrow"><CalendarDays size={14}/> UZTICKET AFISHASI</span><h1>Barcha tadbirlar<span className="purple">.</span></h1><p>Yoqtirgan san’atkoringizni toping, sanani tanlang va joyingizni band qiling.</p></div><div className="events-heading-note"><Heart size={18}/><span>Yurak belgisini bosing — yoqtirgan tadbirlaringiz Sevimlilarda saqlanadi.</span></div></div><Catalog key={params.category || 'all'} events={events} initialCategory={params.category || 'all'} /></main>;
}
