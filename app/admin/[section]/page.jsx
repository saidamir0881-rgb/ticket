import { notFound } from 'next/navigation';
import { authenticatedClient } from '@/lib/supabase/server';
import AdminWorkspace from '@/components/site/admin-workspace';
import Link from 'next/link';
export default async function AdminSection({ params, searchParams }) {
  const { section } = await params;
  if (!['events','venues','bookings','tickets'].includes(section)) notFound();
  const query=await searchParams;
  const page=Math.max(1,Math.min(100000,Number.parseInt(query.page || '1',10) || 1));
  let data=[],venues=[],error,count=0;
  try {
    const { db } = await authenticatedClient(true);
    const select = section === 'events' ? '*,venue:venues(name)' : section === 'bookings' ? '*,customer:profiles!bookings_user_id_fkey(full_name,phone),event:events!bookings_event_id_fkey(title),payments(method),items:booking_seats(*,seat:seats(row_label,seat_number))' : section === 'tickets' ? 'id,booking_id,used_at,created_at,booking:bookings(reference),item:booking_seats(seat:seats(row_label,seat_number))' : '*';
    ({ data, error, count } = await db.from(section).select(select,{count:'exact'}).order('created_at',{ ascending:false }).range((page-1)*50,page*50-1));
    if (section === 'events') { const res=await db.from('venues').select('*').order('name'); venues=res.data || []; if (res.error) error=res.error; }
  } catch(e) { error=e; }
  if (error) return <p className="error-message">{error.message}</p>;
  return <><AdminWorkspace key={`${section}-${page}-${query.create || ''}`} section={section} records={data || []} venues={venues} createNew={query.create==='1'&&['events','venues'].includes(section)} /><div className="results-toolbar" style={{marginTop:25}}>{page>1?<Link className="button button-outline" href={`/admin/${section}?page=${page-1}`}>Oldingi sahifa</Link>:<span />}<span>{page}-sahifa · Jami {count || 0} ta yozuv</span>{page*50<(count || 0)?<Link className="button button-outline" href={`/admin/${section}?page=${page+1}`}>Keyingi sahifa</Link>:<span />}</div></>;
}
