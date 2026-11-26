'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {Ticket,Search,MapPin,UserRound,Menu,X,ArrowUpRight,Send} from 'lucide-react';
import {supportUrl} from '@/lib/support';
import {browserClient} from '@/lib/supabase/browser';

const links=[['/events','Barcha tadbirlar'],['/events?category=concert','Konsertlar'],['/events?category=theatre','Teatrlar'],['/events?category=sport','Sport'],['/events?category=comedy','Stand-up'],['/events?category=festival','Festivallar']];

export default function Header(){
 const [user,setUser]=useState(null),[adminId,setAdminId]=useState(null),[open,setOpen]=useState(false);
 const admin=!!user?.id&&adminId===user.id;
 useEffect(()=>{
  const db=browserClient();
  db.auth.getUser().then(({data})=>setUser(data.user)).catch(()=>{});
  const {data}=db.auth.onAuthStateChange((_event,session)=>setUser(session?.user||null));
  return()=>data.subscription.unsubscribe();
 },[]);
 useEffect(()=>{
  let active=true;
  if(user?.id)browserClient().from('profiles').select('role').eq('id',user.id).single().then(({data})=>{if(active)setAdminId(data?.role==='admin'?user.id:null);});
  return()=>{active=false;};
 },[user?.id]);
 return <header className="header"><div className="container header-main">
  <Link className="logo" href="/" aria-label="UZTICKET bosh sahifa"><span className="logo-icon"><Ticket size={25}/></span><span className="logo-uz">UZ</span><span className="logo-ticket">TICKET</span><i/></Link>
  <form className="header-search" action="/events"><Search size={19}/><input name="q" type="search" placeholder="Tadbirlar, joylar va ijrochilarni qidiring" aria-label="Tadbir, joy yoki ijrochi qidirish"/><button type="submit" aria-label="Qidirish"><ArrowUpRight size={17}/></button></form>
  <div className="header-actions"><span className="header-location"><MapPin size={15}/> Toshkent</span><a className="header-support" href={supportUrl} target="_blank" rel="noopener noreferrer" aria-label="Telegram orqali yordam"><Send size={17}/></a><Link className="header-login" href={user?(admin?'/admin':'/account'):'/login'}><UserRound size={17}/><span>{user?'Kabinetim':'Kirish'}</span></Link><button className="icon-button header-menu-button" aria-label={open?'Menyuni yopish':'Menyuni ochish'} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></div>
 </div><div className={`container header-category-row ${open?'open':''}`}><nav className="header-categories" aria-label="Tadbir turlari" onClick={()=>setOpen(false)}>{links.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav></div></header>;
}
