import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import Account from '@/components/site/account';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shaxsiy kabinet' };
export default async function AccountPage() {
  const db = await serverClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: profile, error: profileError }, { data: bookings, error }] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).single(),
    db.from('bookings').select('*, event:events(title,starts_at,venue:venues(name,address)), items:booking_seats(*,seat:seats(row_label,seat_number)), tickets(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
  ]);
  return <main className="container page-space"><div className="account-heading"><div><span className="eyebrow">REJALARINGIZ SHU YERDA</span><h1>Salom, {profile?.full_name?.split(' ')[0] || 'do‘st'}<span className="purple">.</span></h1><p className="lead">Siz kutgan lahzalarga bir qadam yaqinroq.</p></div></div>{(error || profileError) && <p role="alert" className="error-message">Ma’lumotlarni yuklab bo‘lmadi. Supabase migratsiyalari o‘rnatilganini tekshiring. {error?.message || profileError?.message}</p>}<Account profile={profile || { id: user.id, full_name: '', phone: '' }} email={user.email} bookings={bookings || []} /></main>;
}
