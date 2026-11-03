'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {toast} from 'sonner';
import {browserClient} from '@/lib/supabase/browser';
export default function ReceiptReview({booking}) {
  const router=useRouter(),[busy,setBusy]=useState(false),[url,setUrl]=useState('');
  const payment=Array.isArray(booking.payments)?booking.payments[0]:booking.payments;
  async function open(){setBusy(true);try{const {data,error}=await browserClient().storage.from('payment-receipts').createSignedUrl(payment.receipt_path,120);if(error)throw error;setUrl(data.signedUrl);}catch(e){toast.error(e.message);}finally{setBusy(false);}}
  async function review(approve){const note=prompt(approve?'Bank hisobingizda pul tushganini tekshirdingizmi? Tasdiqlash izohi:':'Chek rad etilishining sababi:');if(note===null)return;if(!approve&&!note.trim()){toast.error('Rad etish sababini yozing.');return;}setBusy(true);try{const response=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'review_receipt',id:booking.id,data:{approve,note}})});const result=await response.json();if(!response.ok)throw new Error(result.error);toast.success(approve?'Tasdiqlandi. QR chipta chiqarildi.':'Chek rad etildi.');router.refresh();}catch(e){toast.error(e.message);}finally{setBusy(false);}}
  if(booking.payment_method!=='card')return null;
  return <div><span className="badge">Karta · {payment?.status==='review'?'Tekshirish kutilmoqda':payment?.status||'Chek kutilmoqda'}</span>{payment?.receipt_path&&<><button className="button button-outline" disabled={busy} onClick={open}>Chekni ko‘rish</button>{url&&<a className="text-link purple" href={url} target="_blank" rel="noopener noreferrer">Chekni ochish (2 daqiqa)</a>}</>}{booking.status==='pending'&&payment?.status==='review'&&<><p className="fine-print">Chekning o‘zi yetarli emas: bankdagi tushumni tekshiring.</p><button className="button" disabled={busy} onClick={()=>review(true)}>Pul tushdi — tasdiqlash</button><button className="button button-danger" disabled={busy} onClick={()=>review(false)}>Chekni rad etish</button></>}</div>;
}
