'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CalendarDays, MapPin, ShoppingBag, ScanLine, ArrowUpRight, ShieldCheck, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { browserClient } from '@/lib/supabase/browser';
const links = [
  ['/admin','Umumiy holat',LayoutDashboard],
  ['/admin/events','Tadbirlar',CalendarDays],
  ['/admin/venues','Manzillar va qatorlar',MapPin],
  ['/admin/bookings','Buyurtmalar',ShoppingBag],
  ['/admin/tickets','Chiptalar va QR',ScanLine],
];
export default function AdminShell({ children, name, email }) {
  const path = usePathname(), router = useRouter();
  const current = links.find(([href])=>href===path)?.[1] || 'Boshqaruv';
  async function logout() {
    const { error } = await browserClient().auth.signOut();
    if (error) return toast.error(error.message);
    router.replace('/admin-login'); router.refresh();
  }
  return <main className="admin-frame"><aside className="admin-sidebar"><div className="admin-brand"><span><ShieldCheck size={21} /></span><div>UZTICKET<small>BOSHQARUV PANELI</small></div></div><p className="admin-nav-label">ISH MAYDONI</p><nav aria-label="Admin navigatsiya">{links.map(([href,label,Icon])=><Link key={href} href={href} aria-current={path===href?'page':undefined} className={path===href?'selected':''}><Icon size={18} />{label}</Link>)}</nav><div className="admin-sidebar-bottom"><Link href="/events"><ArrowUpRight size={17} />Saytni ko‘rish</Link><button onClick={logout}><LogOut size={17} />Hisobdan chiqish</button><div className="admin-identity"><span>{(name || email || 'A').slice(0,1).toUpperCase()}</span><div><strong>{name || 'Administrator'}</strong><small>{email}</small></div></div></div></aside><div className="admin-main"><header className="admin-topbar"><div><span className="eyebrow">BOSHQARUV MARKAZI</span><h1>{current}</h1></div><span className="admin-secure"><ShieldCheck size={15} />Administrator</span></header><div className="admin-content">{children}</div></div></main>;
}
