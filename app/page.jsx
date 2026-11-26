import Link from 'next/link';
import {ArrowUpRight,ArrowRight,MapPin,CalendarDays,Ticket,ShieldCheck,Banknote,Sparkles} from 'lucide-react';
import {listEvents,groupVenues} from '@/lib/events';
import {date,time,money} from '@/lib/format';
import Catalog from '@/components/site/catalog';

export const dynamic='force-dynamic';

export default async function Home(){
 const {events}=await listEvents();
 const venues=groupVenues(events);
 const hero=events.find(e=>e.featured)||events[0];
 const sideEvent=events.find(e=>e.id!==hero?.id)||hero;
 return <main>
  <section className="home-showcase"><div className="container">
   <div className="showcase-grid">
    <Link className="showcase-main" href={hero?`/events/${hero.id}`:'/events'} style={{backgroundImage:`linear-gradient(90deg,rgba(8,8,13,.9) 0%,rgba(8,8,13,.55) 44%,rgba(8,8,13,.08) 100%),linear-gradient(0deg,rgba(8,8,13,.64),transparent 48%),url("${hero?.poster_background_url||hero?.poster_url||'/placeholder.svg'}")`}}>
     <span className="showcase-kicker"><Sparkles size={14}/> UZTICKET TAVSIYA QILADI</span>
     <div className="showcase-main-copy"><span className="showcase-label">BUGUNGI REJANGIZ</span><h1>{hero?.title||'Keyingi unutilmas oqshom'}</h1><div className="showcase-meta">{hero&&<><span><CalendarDays size={15}/>{date(hero.starts_at)} · {time(hero.starts_at)}</span><span><MapPin size={15}/>{hero.venue?.name||'Toshkent'}</span></>}</div><span className="showcase-cta">Tadbirni ko‘rish <ArrowUpRight size={17}/></span></div>
     <span className="showcase-index">01 <i/> AFISHA</span>
    </Link>
    {sideEvent&&<Link className="showcase-side" href={`/events/${sideEvent.id}`} style={{backgroundImage:`linear-gradient(0deg,rgba(8,8,13,.94) 0%,rgba(8,8,13,.12) 82%),url("${sideEvent.poster_background_url||sideEvent.poster_url||'/placeholder.svg'}")`}}>
     <span className="showcase-side-tag">YANGI AFISHA <ArrowUpRight size={14}/></span><div className="showcase-side-copy"><span>{date(sideEvent.starts_at)} · {time(sideEvent.starts_at)}</span><h2>{sideEvent.title}</h2><p><MapPin size={14}/>{sideEvent.venue?.name||'Toshkent'}</p><strong>{money(sideEvent.min_price)} dan</strong></div>
    </Link>}
   </div>
   <div className="showcase-bottom"><span><Ticket size={15}/> Chipta tanlash oson</span><span>O‘zingizga yoqqan tadbirni toping va joyingizni band qiling.</span><Link href="/events">Barcha tadbirlar <ArrowRight size={15}/></Link></div>
  </div></section>
  <section className="container assurance"><div><ShieldCheck/><span>Rasmiy manbalar<small>Tadbirlar va sanalar manbasi bilan</small></span></div><div><Ticket/><span>Elektron chiptalar<small>Chipta shaxsiy kabinetingizda</small></span></div><div><Banknote/><span>Qulay to‘lov<small>Onlayn yoki naqd to‘lang</small></span></div></section>
  <section className="container section"><div className="section-heading"><div><span className="eyebrow">UZTICKET AFISHASI</span><h2>Ommabop tadbirlar<span className="purple">.</span></h2></div><Link className="text-link" href="/events">Barchasini ko‘rish <ArrowRight size={18}/></Link></div><Catalog events={events} compact/></section>
  <section className="container"><div className="experience-banner"><span className="banner-stamp"><Ticket size={38}/></span><div><span className="eyebrow">YAQINLARINGIZ BILAN BIRGA</span><h2>Yaxshi oqshomni tanlang.<br/>Xotirani birga yarating.</h2></div><Link className="button" href="/events">Tadbirlarni ko‘rish <ArrowUpRight size={19}/></Link><span className="decor-circle"/></div></section>
  <section className="container section"><div className="section-heading"><div><span className="eyebrow">SHAHARNING SEVIMLI SAHNALARI</span><h2>Manzillarni kashf eting<span className="purple">.</span></h2></div></div><div className="venues-grid venue-program-grid">{venues.map(v=><article key={v.id} className="venue-program"><Link href={`/venues/${v.id}`} className="venue-card"><div style={{backgroundImage:`linear-gradient(0deg,rgba(12,6,25,.88),rgba(12,6,25,.1)),url("${v.image_url||'/placeholder.svg'}")`}}><span><MapPin size={14}/>{v.city} · {v.events.length} ta tadbir</span><h3>{v.name}</h3><ArrowUpRight size={22}/></div></Link><div className="venue-program-list"><small>USHBU MANZIL AFISHASI</small>{v.events.slice(0,5).map(e=><Link key={e.id} href={`/events/${e.id}`}><img src={e.poster_background_url||e.poster_url||'/placeholder.svg'} alt="" loading="lazy"/><span><strong>{e.title}</strong><small>{date(e.starts_at)} · {time(e.starts_at)}</small></span><ArrowUpRight size={15}/></Link>)}<Link className="venue-all-events" href={`/venues/${v.id}`}>Barcha {v.events.length} ta tadbirni ko‘rish <ArrowRight size={15}/></Link></div></article>)}</div></section>
 </main>;
}
