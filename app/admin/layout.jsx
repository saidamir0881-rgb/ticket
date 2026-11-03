import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import AdminShell from '@/components/site/admin-shell';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administrator', robots: { index: false, follow: false } };
export default async function AdminLayout({ children }) {
  const db = await serverClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error } = await db.from('profiles').select('role,full_name').eq('id', user.id).single();
  if (error) return <main className="container page-space empty-state"><h1>Profil yuklanmadi</h1><p>Ulanishni tekshirib, sahifani yangilang.</p><Link className="button" href="/login">Qayta kirish</Link></main>;
  if (profile?.role !== 'admin') return <main className="container page-space empty-state"><h1>Admin vakolati kerak</h1><p>Bu hisob oddiy mijoz sifatida ro‘yxatdan o‘tgan. Administrator vakolatini loyiha egasi tayinlaydi.</p><Link className="button" href="/login">Boshqa hisob bilan kirish</Link><Link className="text-link" href="/account">Shaxsiy kabinet</Link></main>;
  return <AdminShell name={profile.full_name} email={user.email}>{children}</AdminShell>;
}
