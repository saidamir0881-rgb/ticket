import Link from 'next/link';
import { ArrowUpRight, MapPin, CalendarDays } from 'lucide-react';
import { date, time, money, categoryName } from '@/lib/format';
export default function EventCard({ event }) {
  return <Link href={`/events/${event.id}`} className="event-card"><div className="event-image" style={{ backgroundImage: `url("${event.poster_url || '/placeholder.svg'}")` }}><span className="category-label">{categoryName(event.category)}</span><span className="card-arrow"><ArrowUpRight size={21} /></span></div><div className="event-meta"><CalendarDays size={13} />{date(event.starts_at)}<span>•</span>{time(event.starts_at)}</div><h3>{event.title}</h3><p className="event-venue"><MapPin size={14} />{event.venue?.name || 'Manzil belgilanmagan'}</p><div className="event-price"><strong>{money(event.min_price)}</strong><span>dan boshlab</span></div></Link>;
}
