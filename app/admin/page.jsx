import Link from 'next/link';
import { CalendarDays, ShoppingBag, Ticket, Armchair, Clock3, Banknote, Plus, ScanLine, ArrowUpRight, MapPin } from 'lucide-react';
import { authenticatedClient } from '@/lib/supabase/server';
import { money, date, time, statusName } from '@/lib/format';
import { bookingStatus } from '@/lib/admin-format';
export default async function Dashboard() {
  let stats, recent=[], upcoming=[],error;
  try {
    const {db}=await authenticatedClient(true);
    const results=await Promise.all([
      db.rpc('admin_stats'),
      db.from('bookings').select('id,reference,status,total,expires_at,created_at,customer:profiles!bookings_user_id_fkey(full_name),event:events!bookings_event_id_fkey(title)').order('created_at',{ascending:false}).limit(6),
      db.from('events').select('id,title,starts_at,status,venue:venues(name)').eq('status','published').gte('starts_at',new Date().toISOString()).order('starts_at').limit(4),
    ]);
    for(const result of results) if(result.error) throw result.error;
    stats=results[0].data;recent=results[1].data||[];upcoming=results[2].data||[];
  } catch(e) {error=e;}
  if(error) return <p className="error-message" role="alert">Ma’lumotlar yuklanmadi: {error.message}</p>;
  const cards=[['Tadbirlar',stats.events,CalendarDays,'purple'],['Buyurtmalar',stats.bookings,ShoppingBag,'blue'],['Sotilgan chiptalar',stats.sold,Ticket,'green'],['Bo‘sh joylar',stats.available,Armchair,'blue'],['Kutilayotgan to‘lovlar',stats.pending,Clock3,'amber'],['Tasdiqlangan tushum',money(stats.revenue),Banknote,'green']];
  return <><div className="admin-welcome"><div><span className="eyebrow">BUGUNGI ISHLAR UCHUN TAYYORMISIZ?</span><h2>Hammasi nazoratingizda<span className="purple">.</span></h2><p>Tadbirlaringiz va kassadagi jarayonlarni shu yerdan boshqaring.</p></div><Link className="button" href="/admin/events?create=1"><Plus size={17}/>Yangi tadbir</Link></div><div className="admin-stats">{cards.map(([title,value,Icon,color])=><article key={title} className="admin-stat"><div><span>{title}</span><i className={color}><Icon size={18}/></i></div><strong>{value}</strong></article>)}</div><div className="admin-overview-grid"><section className="panel"><div className="admin-section-title"><h2>Oxirgi buyurtmalar</h2><Link className="text-link purple" href="/admin/bookings">Barchasi<ArrowUpRight size={16}/></Link></div>{recent.length?<div className="table-wrap"><table><thead><tr><th>Buyurtma / mijoz</th><th>Tadbir</th><th>Jami</th><th>Holat</th></tr></thead><tbody>{recent.map(b=>{const status=bookingStatus(b);return <tr key={b.id}><td><strong>{b.reference}</strong><small className="admin-cell-secondary">{b.customer?.full_name||'Mijoz'}</small></td><td>{b.event?.title}</td><td>{money(b.total)}</td><td><span className={`badge ${status}`}>{statusName(status)}</span></td></tr>;})}</tbody></table></div>:<div className="admin-empty"><ShoppingBag size={30}/><h3>Hozircha buyurtmalar yo‘q</h3><p>Birinchi band qilinganda shu yerda ko‘rinadi.</p></div>}</section><section className="panel"><div className="admin-section-title"><h2>Yaqin tadbirlar</h2><CalendarDays size={19}/></div>{upcoming.length?upcoming.map(e=><Link className="admin-upcoming" key={e.id} href={`/events/${e.id}`}><span>{date(e.starts_at)}<small>{time(e.starts_at)}</small></span><div><strong>{e.title}</strong><small><MapPin size={12}/>{e.venue?.name}</small></div><ArrowUpRight size={17}/></Link>):<p className="description">Hozircha e’lon qilingan yaqin tadbirlar yo‘q.</p>}</section></div><div className="admin-quick-links"><Link href="/admin/tickets"><ScanLine size={23}/><div><strong>QR chiptani tekshirish</strong><span>Kirishdagi chipta nazorati</span></div><ArrowUpRight size={19}/></Link><Link href="/admin/bookings"><Banknote size={23}/><div><strong>Naqd to‘lovlarni tasdiqlash</strong><span>Avval pulni qabul qiling, keyin tasdiqlang</span></div><ArrowUpRight size={19}/></Link></div></>;
}
