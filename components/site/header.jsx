'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Ticket, MapPin, UserRound, Menu, X, ArrowUpRight } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
export default function Header() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const db = browserClient();
    db.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {});
    const { data } = db.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => data.subscription.unsubscribe();
  }, []);
  return <><div className="topline"><div className="container"><span>Yaxshi xotiralar bir chiptadan boshlanadi.</span><Link href="/help">Chiptani qanday olaman? <ArrowUpRight size={12} /></Link></div></div>
    <header className="header"><div className="container nav"><Link className="logo" href="/" aria-label="UZTICKET bosh sahifa"><span className="logo-icon"><Ticket size={25} /></span>UZ<span>TICKET</span><i /></Link>
      <nav className={open ? 'navigation open' : 'navigation'} aria-label="Asosiy navigatsiya" onClick={() => setOpen(false)}><Link href="/events">Tadbirlar</Link><Link href="/events?category=concert">Konsertlar</Link><Link href="/events?category=theatre">Teatr</Link><Link href="/events?category=sport">Sport</Link></nav>
      <div className="nav-actions"><span className="location"><MapPin size={16} /> Toshkent</span><Link className="button button-small" href={user ? '/account' : '/login'}><UserRound size={16} /><span>{user ? 'Kabinetim' : 'Kirish'}</span></Link><button className="icon-button mobile-menu" aria-label={open ? 'Menyuni yopish' : 'Menyuni ochish'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>
    </div></header></>;
}
