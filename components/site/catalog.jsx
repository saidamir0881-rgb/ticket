'use client';
import { useState } from 'react';
import { Search, SlidersHorizontal, Sparkles, Music2, Drama, Trophy, Mic2, PartyPopper } from 'lucide-react';
import { categories } from '@/lib/format';
import EventCard from './event-card';
const icons = { Sparkles, Music2, Drama, Trophy, Mic2, PartyPopper };
export default function Catalog({ events, initialCategory = 'all', compact = false }) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date');
  const filtered = events.filter(e => (category === 'all' || e.category === category) && `${e.title} ${e.venue?.name}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => sort === 'price' ? a.min_price - b.min_price : new Date(a.starts_at) - new Date(b.starts_at));
  return <div id="catalog"><div className="catalog-tools"><div className="category-tabs">{categories.map(c => { const Icon = icons[c.icon]; return <button key={c.id} className={category === c.id ? 'active' : ''} onClick={() => setCategory(c.id)}><Icon size={17} />{c.name}</button>; })}</div><label className="search-field"><Search size={18} /><input aria-label="Tadbir qidirish" placeholder="Tadbir yoki manzil..." value={query} onChange={e => setQuery(e.target.value)} /></label></div>{!compact && <div className="results-toolbar"><span>{filtered.length} ta tadbir</span><label><SlidersHorizontal size={16} /><select aria-label="Saralash" value={sort} onChange={e => setSort(e.target.value)}><option value="date">Sana bo‘yicha</option><option value="price">Arzonidan boshlab</option></select></label></div>}
    {filtered.length ? <div className="events-grid">{filtered.map(e => <EventCard key={e.id} event={e} />)}</div> : <div className="empty-state"><Search size={34} /><h3>Tadbir topilmadi</h3><p>Boshqa nom yoki turkumni sinab ko‘ring.</p><button className="button" onClick={() => { setQuery(''); setCategory('all'); }}>Filtrlarni tozalash</button></div>}</div>;
}
