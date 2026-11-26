'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import FullTicket from './full-ticket';
import {Ticket,LogOut,CreditCard,CheckCircle2,Copy} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {date,time,money,statusName} from '@/lib/format';
import {mergeBookingUpdate} from '@/lib/booking-updates';
import CashPointsMap from './cash-points-map';

function CopyPaymentValue({value,label}){
  const [copied,setCopied]=useState(false);
  async function copy(){try{await navigator.clipboard.writeText(String(value));setCopied(true);toast.success(`${label} nusxalandi.`);setTimeout(()=>setCopied(false),1800);}catch{toast.error('Nusxalab bo‘lmadi. Qiymatni qo‘lda belgilang.');}}
  return <button type="button" className="button button-outline" onClick={copy}><Copy size={15}/>{copied?'Nusxalandi':'Nusxalash'}</button>;
}

function Booking({booking,now,onCancel,onPay,busy}) {
  const payment=Array.isArray(booking.payments)?booking.payments[0]:booking.payments;
  const hamyonDeadline=payment?.method==='hamyon'&&payment?.updated_at?new Date(payment.updated_at).getTime()+5*60*1000:null;
  const deadline=payment?.method==='hamyon'&&hamyonDeadline?Math.min(new Date(booking.expires_at).getTime(),hamyonDeadline):new Date(booking.expires_at).getTime();
  const left=Math.max(0,Math.ceil((deadline-now)/1000));
  const status=booking.status==='pending'&&left===0?'expired':booking.status;
  const testPaid=payment?.method==='demo_card';
  const review=payment?.status==='review'&&status==='pending';
  return <article className="booking-card" id={`booking-${booking.id}`}><div className="booking-card-top"><span className="booking-reference">{booking.reference}</span><span className={`badge ${status}`}>{review?'Chek tekshirilmoqda':statusName(status)}</span></div><h3>{booking.event?.title||'Tadbir'}</h3><p>{booking.event?.venue?.name} · {booking.event&&date(booking.event.starts_at)} · {booking.event&&time(booking.event.starts_at)}</p><div className="booking-facts"><span>{booking.items?.map(i=>`${i.seat?.row_label}-qator / ${i.seat?.seat_number}-joy`).join(', ')}</span><strong>{money(booking.total)}</strong></div>{payment?.status==='rejected'&&<p className="error-message">Chek rad etildi: {payment.review_note}</p>}{status==='expired'&&<p className="notice">To‘lov muddati tugagan. Agar pul kartangizdan yechilgan bo‘lsa, qayta to‘lamang va yordam xizmatiga buyurtma raqamini yuboring.</p>}{status==='pending'&&<><div className="countdown">{review?'Tekshirish muddati: ':'Tolash uchun qoldi: '}<strong>{String(Math.floor(left/3600)).padStart(2,'0')}:{String(Math.floor(left/60)%60).padStart(2,'0')}:{String(left%60).padStart(2,'0')}</strong></div>{review?<p>Chek yuborildi. Admin tekshiruvini kuting.</p>:booking.payment_method==='card'?payment?.hamyon_card?<div className="notice payment-instructions"><strong>To‘lov</strong><p>Summa</p><div className="booking-actions"><strong>{money(payment.hamyon_amount)} so‘m</strong><CopyPaymentValue value={payment.hamyon_amount} label="Summa"/></div><p>Karta raqami</p><div className="booking-actions"><strong>{payment.hamyon_card}</strong><CopyPaymentValue value={payment.hamyon_card.replaceAll(' ','')} label="Karta raqami"/></div><a className="click-pay-link" href="https://my.click.uz/clickp2p/D0123096A9DD2D6767F7C7156A3FE9BBA56A4A2B12D798C9F55EE0AD95073C04" target="_blank" rel="noopener noreferrer">Click orqali to‘lash <span aria-hidden="true">↗</span></a><small>Click’da yuqoridagi aniq summani kiriting. To‘lov tasdiqlansa, chipta avtomatik chiqadi.</small></div>:<p>To‘lov ma’lumotlarini olish uchun tugmani bosing.</p>:<p>Tanlangan punktda naqd tolang va buyurtma raqamini ko‘rsating.</p>}{booking.pickup&&<div className="booking-point"><h4>{booking.pickup.name}</h4><p>{booking.pickup.address} - {booking.pickup.hours}</p><CashPointsMap points={[booking.pickup]} selectedId={booking.pickup.id} readOnly/></div>}<div className="booking-actions">{booking.payment_method==='card'&&!payment?.hamyon_payment_id&&<button className="button" onClick={()=>onPay(booking)} disabled={busy}><CreditCard size={17}/>To‘lovni ochish</button>}{!review&&<button className="button button-danger" disabled={busy} onClick={()=>onCancel(booking.id)}>Bandni bekor qilish</button>}</div><p className="fine-print">To‘lov tasdiqlangach, QR chipta avtomatik ko‘rinadi.</p></>}{status==='paid'&&<><p className="payment-confirmed" role="status"><CheckCircle2 size={17}/>{testPaid?'Demo to‘lov tasdiqlandi · Haqiqiy pul yechilmagan':'To‘lov tasdiqlandi · QR chiptangiz tayyor'}</p><div className="tickets-grid">{booking.tickets?.map(t=><FullTicket key={t.id} ticket={t} event={booking.event} seat={(()=>{const item=booking.items?.find(i=>i.id===t.booking_seat_id);return {...item?.seat,price:item?.price};})()} reference={booking.reference} invalid={testPaid||!booking.event||booking.event.is_demo}/>)}</div>{!booking.tickets?.length&&<p role="status">QR chipta olinmoqda...</p>}</>}</article>;
}
export default function Account({profile,email,bookings}) {
  const [records,setRecords]=useState(bookings),[now,setNow]=useState(Date.now),[busy,setBusy]=useState(false),[cancelBusy,setCancelBusy]=useState(false),[paying,setPaying]=useState(null),[syncError,setSyncError]=useState(false);
  const [previousBookings,setPreviousBookings]=useState(bookings);
  if(previousBookings!==bookings){
    setPreviousBookings(bookings);
    setRecords(bookings.map(b=>mergeBookingUpdate(records.find(p=>p.id===b.id)||b,b)));
  }
  const router=useRouter();
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
        const {data,error}=await browserClient().from('bookings').select('id,status,expires_at,updated_at,tickets(*),payments(method,status,review_note,hamyon_payment_id,hamyon_amount,hamyon_card,updated_at)').eq('user_id',profile.id).in('id',pendingIds.split(',')).abortSignal(controller.signal);
        if(error)throw error;
        if(active) {setSyncError(false);setRecords(prev=>prev.map(b=>mergeBookingUpdate(b,data.find(row=>row.id===b.id))));}
      } catch {if(active)setSyncError(true);} finally {inFlight=false;}
    }
    sync();const timer=setInterval(sync,3000);
    document.addEventListener('visibilitychange',sync);
    return()=>{active=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',sync);};
  },[pendingIds,profile.id]);
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
  async function createHamyonPayment(booking){setCancelBusy(true);try{const r=await fetch('/api/payments/hamyon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({booking_id:booking.id})});const d=await r.json();if(!r.ok)throw new Error(d.error);router.refresh();toast.success('To‘lov ma’lumotlari tayyor.');}catch(e){toast.error(e.message);}finally{setCancelBusy(false);}}
  async function logout(){const {error}=await browserClient().auth.signOut();if(error)toast.error(error.message);else{router.push('/');router.refresh();}}
  return <div className="account-layout"><aside className="panel account-sidebar"><h3>Shaxsiy ma’lumotlar</h3><p className="fine-print" style={{marginBottom:20}}>{email}</p><form onSubmit={save}><label className="field">Ism<input name="full_name" defaultValue={profile.full_name} required maxLength={100}/></label><label className="field">Telefon<input name="phone" type="tel" defaultValue={profile.phone} maxLength={30} placeholder="+998"/></label><button className="button" disabled={busy}>{busy?'Saqlanmoqda...':'Saqlash'}</button></form><button className="button button-outline" onClick={logout}><LogOut size={15}/>Chiqish</button></aside><section aria-busy={cancelBusy}><h2 style={{fontSize:25}}>Buyurtmalar va chiptalar</h2>{syncError&&<p role="status" className="notice">Ulanish vaqtincha uzildi. To‘lov holatini avtomatik qayta tekshiryapmiz.</p>}{records.length?records.map(b=><Booking booking={b} now={now} onCancel={cancel} onPay={createHamyonPayment} busy={cancelBusy} key={b.id}/>):<div className="empty-state"><Ticket size={35}/><h3>Hali rejalaringiz yo‘qmi?</h3><p>Birinchi tadbiringizni tanlash vaqti keldi.</p><Link className="button" href="/events">Tadbirlarni ko‘rish</Link></div>}</section></div>;
}
