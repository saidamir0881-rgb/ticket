'use client';
import {useEffect,useRef,useState} from 'react';
import {CreditCard,X,CheckCircle2} from 'lucide-react';
import {demoCards,demoCardCode} from '@/lib/demo-cards';
import {money} from '@/lib/format';
export default function DemoPayment({booking,onClose,onPaid}) {
  const dialog=useRef(null);
  const [number,setNumber]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{dialog.current.showModal();},[]);
  async function submit(e) {
    e.preventDefault();setError('');
    const code=demoCardCode(number);
    if(!code) {setError('Quyidagi soxta test kartalaridan birini kiriting. Haqiqiy karta ishlatmang.');return;}
    setBusy(true);
    try {
      const response=await fetch(`/api/bookings/${booking.id}/demo-payment`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({test_card:code})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      onPaid(data.booking);onClose();
    } catch(e) {setError(e.message);} finally {setBusy(false);}
  }
  return <dialog ref={dialog} className="payment-dialog" onCancel={e=>{if(busy)e.preventDefault();else onClose();}} aria-labelledby="payment-title"><div className="payment-heading"><span className="payment-symbol"><CreditCard size={25}/></span><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Yopish"><X size={20}/></button></div><span className="eyebrow">DEMO TO‘LOV · HAQIQIY PUL YECHILMAYDI</span><h2 id="payment-title">Test karta bilan to‘lash</h2><p className="description">{booking.reference} · {money(booking.total)}<br/>Muvaffaqiyatli test to‘lovdan keyin QR chipta darhol ko‘rinadi.</p><div className="test-card-options">{demoCards.map(card=><button type="button" key={card.code} onClick={()=>{setNumber(card.number);setError('');}} disabled={busy}><span>{card.name}</span><strong>{card.number}</strong></button>)}</div><form onSubmit={submit}><label className="field">Soxta karta raqami<input value={number} onChange={e=>setNumber(e.target.value)} inputMode="numeric" autoComplete="off" maxLength={23} placeholder="4242 4242 4242 4242" required disabled={busy}/><small>Faqat yuqoridagi namunalar. Haqiqiy karta yoki CVV kiritmang.</small></label>{error&&<p role="alert" className="error-message">{error}</p>}<button className="button" disabled={busy}><CheckCircle2 size={17}/>{busy?'Tasdiqlanmoqda...':'Test to‘lovni tasdiqlash'}</button></form></dialog>;
}
