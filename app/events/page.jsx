import { listEvents } from '@/lib/events';
import Catalog from '@/components/site/catalog';
export const metadata = { title: 'Barcha tadbirlar' };
export const dynamic = 'force-dynamic';
export default async function Events({ searchParams }) {
  const { events, setup } = await listEvents();
  const params = await searchParams;
  return <main className="container page-space"><span className="eyebrow">O‘ZINGIZ UCHUN VAQT AJRATING</span><h1>Barcha tadbirlar<span className="purple">.</span></h1><p className="lead">Bugun reja qiling. Ertaga xotiralar bilan yashang.</p><Catalog key={params.category || 'all'} events={events} initialCategory={params.category || 'all'} /></main>;
}
