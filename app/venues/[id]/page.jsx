import { notFound } from 'next/navigation';
import { listEvents, groupVenues } from '@/lib/events';
import EventCard from '@/components/site/event-card';
import { MapPin } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function Venue({ params }) {
  const { id } = await params;
  const {events}=await listEvents();
  const venues=groupVenues(events);
  const venue = venues.find(v => v.venue_ids.includes(id));
  if (!venue) notFound();
  const items = venue.events;
  return <main className="container page-space"><span className="eyebrow">TADBIR MANZILI</span><h1>{venue.name}</h1><p className="lead"><MapPin size={18} /> {venue.address}</p><div className="venue-cover" style={{ backgroundImage: `url("${venue.image_url || '/placeholder.svg'}")` }} /><h2>Ushbu manzildagi tadbirlar ? {items.length}</h2>{items.length ? <div className="events-grid">{items.map(e => <EventCard key={e.id} event={e} />)}</div> : <p className="empty-state">Hozircha tadbirlar yo‘q.</p>}</main>;
}
