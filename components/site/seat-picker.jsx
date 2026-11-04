'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
import { money } from '@/lib/format';
import CheckoutChoice from './checkout-choice';
const demoSeats = Array.from({ length: 80 }, (_, i) => ({ id: `sample-${i}`, row_label: String(Math.floor(i / 10) + 1), seat_number: i % 10 + 1, price: 500000 - Math.floor(i / 10) * 50000, category: i < 20 ? 'VIP' : 'Standard', status: i === 13 || i === 26 ? 'sold' : i === 37 ? 'reserved' : 'available' }));
export default function SeatPicker({ eventId, demo, sport, testPayment=false }) {
  const instructions=demo?'Bu namuna xaritasi. Buyurtma yaratilmaydi.':'Karta yoki naqd usulini tanlang. Naqd tolov uchun punktda 1 soat ichida tolang.';
  const [seats, setSeats] = useState(demo ? demoSeats : []), [selected, setSelected] = useState([]), [loading, setLoading] = useState(!demo), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const router = useRouter();
  const [checkout,setCheckout]=useState(false);
  const load = useCallback(async () => {
    if (demo) return;
    try {
      const { data, error } = await browserClient().rpc('get_event_seats', { p_event_id: eventId });
      if (error) throw error;
      setSeats(data || []); setError(data?.length?'':'Bu tadbir uchun joylar bazada hali ochilmagan. Administrator sotuv sozlamalarini yakunlashi kerak.');
      setSelected(prev => prev.filter(s => data.some(d => d.id === s.id && d.status === 'available')));
    } catch(e) { setError(e.message); } finally { setLoading(false); }
  }, [demo, eventId]);
  useEffect(() => { load(); const timer = setInterval(load, 3000); const refresh=()=>{if(document.visibilityState==='visible')load();};document.addEventListener('visibilitychange',refresh);return () => {clearInterval(timer);document.removeEventListener('visibilitychange',refresh);}; }, [load]);
  function toggle(seat) { setSelected(prev => prev.some(s => s.id === seat.id) ? prev.filter(s => s.id !== seat.id) : prev.length >= 8 ? (toast.error('Bir buyurtmada ko‘pi bilan 8 ta joy.'), prev) : [...prev, seat]); }
  async function reserve(payment) {
    if (demo) return;
    setBusy(true);
    try {
      const response = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event_id:eventId,seat_ids:selected.map(s=>s.id),...payment }) });
      const result = await response.json();
      if (response.status === 401) { router.push('/login'); return; }
      if (!response.ok) throw new Error(result.error);
      setCheckout(false);toast.success(payment.payment_method==='cash'?'Joylar 1 soatga band qilindi.':'Buyurtma yaratildi. Kartaga o‘tkazib, chek yuboring.');router.push('/account');router.refresh();
    } catch(e) { toast.error(e.message); await load(); } finally { setBusy(false); }
  }
  const rows = [...new Set(seats.map(s => s.row_label))];
  return <>{demo && <p className="notice">Namuna xaritasi: joy tanlashni sinab ko‘rishingiz mumkin, buyurtma yaratilmaydi.</p>}{error && <p role="alert" className="error-message">Joylarni yuklab bo‘lmadi: {error} <button className="icon-button" onClick={load} aria-label="Qayta yuklash"><RefreshCw size={15} /></button></p>}<div className="booking-layout"><div className="seatmap" aria-busy={loading}><div className="stage">{sport ? 'FUTBOL MAYDONI' : 'SAHNA'}</div>{loading ? <p className="empty-state">Joylar yuklanmoqda...</p> : !seats.length ? <p className="empty-state">Bu tadbir uchun joylar hali tayyorlanmagan.</p> : rows.map(row => <div className="seat-row" key={row}><span className="row-label">{row}</span>{seats.filter(s => s.row_label === row).sort((a,b) => a.seat_number - b.seat_number).map(s => { const active = selected.some(x => x.id === s.id); return <button key={s.id} className={`seat ${active ? 'selected' : s.status}`} title={`${s.category} · ${row}-qator, ${s.seat_number}-joy · ${money(s.price)}`} aria-label={`${row}-qator, ${s.seat_number}-joy, ${money(s.price)}, ${s.status}`} aria-pressed={active} disabled={s.status !== 'available' || busy} onClick={() => toggle(s)}>{s.seat_number}</button>; })}<span className="row-label">{row}</span></div>)}<div className="seat-legend"><span><i />Bo‘sh</span><span><i className="selected" />Tanlangan</span><span><i className="reserved" />Band</span><span><i className="sold" />Sotilgan</span></div></div><aside className="panel booking-summary"><h3>Sizning tanlovingiz</h3>{selected.length ? selected.map(s => <div className="selected-seat" key={s.id}><span>{s.row_label}-qator, {s.seat_number}-joy</span><strong>{money(s.price)}</strong></div>) : <p className="fine-print">Xaritadan bo‘sh joylarni tanlang.</p>}<div className="summary-total"><span>Jami</span><strong>{money(selected.reduce((sum,s) => sum + Number(s.price),0))}</strong></div><button className="button" disabled={demo || !selected.length || busy} onClick={()=>setCheckout(true)}>{busy ? 'Band qilinmoqda...' : demo ? 'Band qilish hozircha yopiq' : 'Band qilish'}<ArrowRight size={16} /></button><p className="fine-print">{instructions}</p></aside></div>{checkout&&<CheckoutChoice onClose={()=>setCheckout(false)} onConfirm={reserve} busy={busy} testMode={testPayment}/>}</>;
}
