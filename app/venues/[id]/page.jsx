import { notFound } from 'next/navigation';
import { listEvents, listVenues } from '@/lib/events';
import EventCard from '@/components/site/event-card';
import { MapPin } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function Venue({ params }) {
  const { id } = await params;
  const [venues, { events }] = await Promise.all([listVenues(), listEvents()]);
  const venue = venues.find(v => v.id === id);
  if (!venue) notFound();
  const items = events.filter(e => e.venue?.id === id);
  return <main className="container page-space"><span className="eyebrow">TADBIR MANZILI</span><h1>{venue.name}</h1><p className="lead"><MapPin size={18} /> {venue.address}</p><div className="venue-cover" style={{ backgroundImage: `url("${venue.image_url || '/placeholder.svg'}")` }} /><h2>Ushbu manzildagi tadbirlar</h2>{items.length ? <div className="events-grid">{items.map(e => <EventCard key={e.id} event={e} />)}</div> : <p className="empty-state">Hozircha tadbirlar yo‘q.</p>}</main>;
}
