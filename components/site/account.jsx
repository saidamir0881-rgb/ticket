'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import QRCode from 'qrcode';
import {Ticket,LogOut,CreditCard,CheckCircle2} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {date,time,money,statusName} from '@/lib/format';
import {mergeBookingUpdate} from '@/lib/booking-updates';
import DemoPayment from './demo-payment';

function TicketCard({ticket,items,demo}) {
  const [qr,setQr]=useState('');
  const item=items.find(i=>i.id===ticket.booking_seat_id);
  useEffect(()=>{
    let active=true;
    QRCode.toDataURL(ticket.qr_token,{width:280,margin:2,errorCorrectionLevel:'M'}).then(value=>{if(active)setQr(value);}).catch(()=>toast.error('QR yaratib bo‘lmadi. Qayta urinib ko‘ring.'));
    return ()=>{active=false;};
  },[ticket.qr_token]);
  return <div className="ticket-card">{qr?<img src={qr} alt="Shaxsiy kirish QR chiptasi"/>:<div className="skeleton" style={{width:110,height:110}}/>}<div><strong>{item?.seat?.row_label}-qator · {item?.seat?.seat_number}-joy</strong>{demo&&<span className="badge">DEMO CHIPTA</span>}<p>{ticket.used_at?'Chipta ishlatilgan':'Kirishda QR kodni ko‘rsating'}</p>{qr&&<a className="text-link purple" href={qr} download={`uzticket-${ticket.id}.png`}>QR yuklab olish</a>}</div></div>;
}
function Booking({booking,now,onCancel,onPay,busy}) {
  const left=Math.max(0,Math.ceil((new Date(booking.expires_at).getTime()-now)/1000));
  const status=booking.status==='pending'&&left===0?'expired':booking.status;
  const testPaid=Array.isArray(booking.payments)?booking.payments.some(p=>p.method==='demo_card'):booking.payments?.method==='demo_card';
  return <article className="booking-card" id={`booking-${booking.id}`}><div className="booking-card-top"><span className="booking-reference">{booking.reference}</span><span className={`badge ${status}`}>{statusName(status)}</span></div><h3>{booking.event?.title||'Tadbir'}</h3><p>{booking.event?.venue?.name} · {booking.event&&date(booking.event.starts_at)} · {booking.event&&time(booking.event.starts_at)}</p><div className="booking-facts"><span>{booking.items?.map(i=>`${i.seat?.row_label}-qator / ${i.seat?.seat_number}-joy`).join(', ')}</span><strong>{money(booking.total)}</strong></div>{status==='pending'&&<><div className="countdown">To‘lash uchun qoldi: <strong>{Math.floor(left/60)}:{String(left%60).padStart(2,'0')}</strong></div>{booking.event?.is_demo?<p>Demo karta bilan sinab ko‘ring — haqiqiy pul yechilmaydi. Yoki kassada naqd to‘lang.</p>:<p>{booking.event?.venue?.address}. Kassada naqd to‘lang va buyurtma raqamini ko‘rsating.</p>}<div className="booking-actions">{booking.event?.is_demo&&<button className="button" onClick={()=>onPay(booking)} disabled={busy}><CreditCard size={17}/>Demo karta bilan to‘lash</button>}<button className="button button-danger" disabled={busy} onClick={()=>onCancel(booking.id)}>Bandni bekor qilish</button></div><p className="fine-print">To‘lov tasdiqlangach, QR chipta avtomatik ko‘rinadi.</p></>}{status==='paid'&&<><p className="payment-confirmed" role="status"><CheckCircle2 size={17}/>{testPaid?'Demo to‘lov tasdiqlandi · Haqiqiy pul yechilmagan':'To‘lov tasdiqlandi · QR chiptangiz tayyor'}</p><div className="tickets-grid">{booking.tickets?.map(t=><TicketCard key={t.id} ticket={t} items={booking.items||[]} demo={testPaid}/>)}</div>{!booking.tickets?.length&&<p role="status">QR chipta olinmoqda...</p>}</>}</article>;
}
export default function Account({profile,email,bookings}) {
  const [records,setRecords]=useState(bookings),[now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[cancelBusy,setCancelBusy]=useState(false),[paying,setPaying]=useState(null),[syncError,setSyncError]=useState(false);
  const router=useRouter();
  useEffect(()=>{setRecords(previous=>bookings.map(b=>mergeBookingUpdate(previous.find(p=>p.id===b.id)||b,b)));},[bookings]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const pendingIds=records.filter(b=>b.status==='pending'||(b.status==='paid'&&!b.tickets?.length)).map(b=>b.id).join(',');
  useEffect(()=>{
    if(!pendingIds)return;
    let active=true,inFlight=false;
    const controller=new AbortController();
    async function sync() {
      if(inFlight||document.hidden)return;
      inFlight=true;
      try {
        const {data,error}=await browserClient().from('bookings').select('id,status,updated_at,tickets(*),payments(method)').eq('user_id',profile.id).in('id',pendingIds.split(',')).abortSignal(controller.signal);
        if(error)throw error;
        if(active) {setSyncError(false);setRecords(prev=>prev.map(b=>mergeBookingUpdate(b,data.find(row=>row.id===b.id))));}
      } catch {if(active)setSyncError(true);} finally {inFlight=false;}
    }
    sync();const timer=setInterval(sync,3000);
    document.addEventListener('visibilitychange',sync);
    return()=>{active=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',sync);};
  },[pendingIds,profile.id]);
  function paid(update) {
    setRecords(prev=>prev.map(b=>b.id===update.id?mergeBookingUpdate(b,update):b));
    toast.success('Demo to‘lov tasdiqlandi. QR chiptangiz tayyor!');
  }
  async function save(e) {
    e.preventDefault();setBusy(true);
    const values=Object.fromEntries(new FormData(e.currentTarget));
    try {const {error}=await browserClient().from('profiles').update(values).eq('id',profile.id);if(error)throw error;toast.success('Profil saqlandi.');router.refresh();}catch(e){toast.error(e.message);}finally{setBusy(false);}
  }
  async function cancel(id) {
    if(cancelBusy||!confirm('Band qilishni bekor qilasizmi?'))return;
    setCancelBusy(true);
    try {const response=await fetch(`/api/bookings/${id}`,{method:'DELETE'});const result=await response.json();if(!response.ok)throw new Error(result.error);setRecords(prev=>prev.map(b=>b.id===id?{...b,status:'cancelled'}:b));toast.success('Band bekor qilindi.');}catch(e){toast.error(e.message);}finally{setCancelBusy(false);}
  }
  async function logout(){const {error}=await browserClient().auth.signOut();if(error)toast.error(error.message);else{router.push('/');router.refresh();}}
  return <div className="account-layout"><aside className="panel account-sidebar"><h3>Shaxsiy ma’lumotlar</h3><p className="fine-print" style={{marginBottom:20}}>{email}</p><form onSubmit={save}><label className="field">Ism<input name="full_name" defaultValue={profile.full_name} required maxLength={100}/></label><label className="field">Telefon<input name="phone" type="tel" defaultValue={profile.phone} maxLength={30} placeholder="+998"/></label><button className="button" disabled={busy}>{busy?'Saqlanmoqda...':'Saqlash'}</button></form><button className="button button-outline" onClick={logout}><LogOut size={15}/>Chiqish</button></aside><section aria-busy={cancelBusy}><h2 style={{fontSize:25}}>Buyurtmalar va chiptalar</h2>{syncError&&<p role="status" className="notice">Ulanish vaqtincha uzildi. To‘lov holatini avtomatik qayta tekshiryapmiz.</p>}{records.length?records.map(b=><Booking booking={b} now={now} onCancel={cancel} onPay={setPaying} busy={cancelBusy} key={b.id}/>):<div className="empty-state"><Ticket size={35}/><h3>Hali rejalaringiz yo‘qmi?</h3><p>Birinchi tadbiringizni tanlash vaqti keldi.</p><Link className="button" href="/events">Tadbirlarni ko‘rish</Link></div>}</section>{paying&&<DemoPayment booking={paying} onClose={()=>setPaying(null)} onPaid={paid}/>}</div>;
}
