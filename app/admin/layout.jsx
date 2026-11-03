import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administrator', robots: { index: false, follow: false } };
export default async function AdminLayout({ children }) {
  const db = await serverClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return <main className="container page-space empty-state"><h1>Ruxsat cheklangan</h1><p>Bu bo‘lim faqat vakolatli administrator uchun.</p><Link className="button" href="/account">Kabinetga qaytish</Link></main>;
  return <main className="container page-space"><span className="eyebrow">UZTICKET BOSHQARUV MARKAZI</span><h1>Admin panel<span className="purple">.</span></h1><nav className="admin-tabs" aria-label="Admin navigatsiya"><Link href="/admin">Umumiy holat</Link><Link href="/admin/events">Tadbirlar</Link><Link href="/admin/venues">Manzillar</Link><Link href="/admin/bookings">Buyurtmalar</Link><Link href="/admin/tickets">Chiptalar va QR</Link></nav>{children}</main>;
}
