import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import Account from '@/components/site/account';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shaxsiy kabinet' };
export default async function AccountPage() {
  const db = await serverClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');
  let [{ data: profile, error: profileError }, { data: bookings, error }] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).single(),
    db.from('bookings').select('*, event:events(title,starts_at,is_demo,venue:venues(name,address)), items:booking_seats(*,seat:seats(row_label,seat_number)), tickets(*),payments(method,status,review_note),pickup:cash_points(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
  ]);
  if(error&&['PGRST200','PGRST204','PGRST205','42703'].includes(error.code)) {
    const legacy=await db.from('bookings').select('*,event:events(title,starts_at,is_demo,venue:venues(name,address)),items:booking_seats(*,seat:seats(row_label,seat_number)),tickets(*),payments(method,status)').eq('user_id',user.id).order('created_at',{ascending:false});
    bookings=legacy.data;error=legacy.error;
  }
  return <main className="container page-space"><div className="account-heading"><div><span className="eyebrow">REJALARINGIZ SHU YERDA</span><h1>Salom, {profile?.full_name?.split(' ')[0] || 'do‘st'}<span className="purple">.</span></h1><p className="lead">Siz kutgan lahzalarga bir qadam yaqinroq.</p></div></div>{(error || profileError) && <p role="alert" className="error-message">Ma’lumotlarni yuklab bo‘lmadi. Supabase migratsiyalari o‘rnatilganini tekshiring. {error?.message || profileError?.message}</p>}<Account profile={profile || { id: user.id, full_name: '', phone: '' }} email={user.email} bookings={bookings || []} /></main>;
}
