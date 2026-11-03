'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {X,ExternalLink,RefreshCw,FileText} from 'lucide-react';
import {toast} from 'sonner';
import {browserClient} from '@/lib/supabase/browser';

function ReceiptViewer({preview,onClose,onRetry}) {
  const dialog=useRef(null),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false);
  useEffect(()=>{dialog.current.showModal();},[]);
  return <dialog ref={dialog} className="receipt-dialog" onCancel={onClose} aria-labelledby="receipt-title"><div className="receipt-toolbar"><div><h2 id="receipt-title">To‘lov cheki</h2><p>{preview.reference}</p></div><button className="icon-button" onClick={onClose} aria-label="Chekni yopish"><X size={22}/></button></div><div className="receipt-preview" aria-busy={loading}>{loading&&!failed&&<p role="status">Chek yuklanmoqda...</p>}{failed?<div className="empty-state"><FileText size={30}/><h3>Chekni ko‘rsatib bo‘lmadi</h3><p>Havola muddati tugagan yoki faylni yuklashda xato yuz berdi.</p><button className="button" onClick={onRetry}><RefreshCw size={15}/>Qayta yuklash</button></div>:preview.pdf?<iframe title="PDF to‘lov cheki" src={preview.url} onLoad={()=>setLoading(false)} onError={()=>{setFailed(true);setLoading(false);}}/>:<img src={preview.url} alt={`${preview.reference} buyurtmasining to‘lov cheki`} onLoad={()=>setLoading(false)} onError={()=>{setFailed(true);setLoading(false);}}/>}</div><div className="receipt-footer"><button className="button button-outline" onClick={onRetry}><RefreshCw size={15}/>Yangilash</button><a className="button button-outline" href={preview.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Alohida oynada ochish</a></div><p className="fine-print">Chek yopiq saqlanadi. Tasdiqlashdan oldin bankdagi tushumni tekshiring.</p></dialog>;
}
export default function ReceiptReview({booking}) {
  const router=useRouter(),[busy,setBusy]=useState(false),[preview,setPreview]=useState(null);
  const payment=Array.isArray(booking.payments)?booking.payments[0]:booking.payments;
  async function open(){setBusy(true);try{const {data,error}=await browserClient().storage.from('payment-receipts').createSignedUrl(payment.receipt_path,120);if(error)throw error;if(!data?.signedUrl)throw new Error('Chek havolasi olinmadi.');setPreview({url:data.signedUrl,pdf:/\.pdf$/i.test(payment.receipt_path),reference:booking.reference,key:Date.now()});}catch(e){toast.error(e.message);}finally{setBusy(false);}}
  function retry(){setPreview(null);open();}
  async function review(approve){const note=prompt(approve?'Bank hisobingizda pul tushganini tekshirdingizmi? Tasdiqlash izohi:':'Chek rad etilishining sababi:');if(note===null)return;if(!approve&&!note.trim()){toast.error('Rad etish sababini yozing.');return;}setBusy(true);try{const response=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'review_receipt',id:booking.id,data:{approve,note}})});const result=await response.json();if(!response.ok)throw new Error(result.error);toast.success(approve?'Tasdiqlandi. QR chipta chiqarildi.':'Chek rad etildi.');router.refresh();}catch(e){toast.error(e.message);}finally{setBusy(false);}}
  if(booking.payment_method!=='card')return null;
  return <div><span className="badge">Karta · {payment?.status==='review'?'Tekshirish kutilmoqda':payment?.status||'Chek kutilmoqda'}</span>{payment?.receipt_path&&<button className="button button-outline" disabled={busy} onClick={open}>{busy?'Yuklanmoqda...':'Chekni ko‘rish'}</button>}{booking.status==='pending'&&payment?.status==='review'&&<><p className="fine-print">Chekning o‘zi yetarli emas: bankdagi tushumni tekshiring.</p><button className="button" disabled={busy} onClick={()=>review(true)}>Pul tushdi — tasdiqlash</button><button className="button button-danger" disabled={busy} onClick={()=>review(false)}>Chekni rad etish</button></>}{preview&&<ReceiptViewer key={preview.key} preview={preview} onClose={()=>setPreview(null)} onRetry={retry}/>}</div>;
}
