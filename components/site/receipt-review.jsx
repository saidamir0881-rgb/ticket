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
function PaymentDecision({approve,booking,busy,error,onClose,onSubmit}) {
  const dialog=useRef(null);
  useEffect(()=>{dialog.current.showModal();},[]);
  function submit(e){e.preventDefault();const form=new FormData(e.currentTarget);onSubmit({approve,note:String(form.get('note')||'').trim()});}
  return <dialog ref={dialog} className="payment-dialog decision-dialog" aria-labelledby="decision-title" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}><div className="receipt-toolbar"><h2 id="decision-title">{approve?'Pul tushganini tasdiqlash':'Pul tushmaganini belgilash'}</h2><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Qaror oynasini yopish"><X size={21}/></button></div><p className="description">Buyurtma: <strong>{booking.reference}</strong></p><form onSubmit={submit}>{approve?<label className="check-field"><input name="verified" type="checkbox" required disabled={busy}/>Bank hisobimda aynan shu buyurtma summasi tushganini tekshirdim.</label>:<p className="notice">Chek rad etiladi va band qilingan joylar bo‘shaydi. Mijoz sababni kabinetida ko‘radi.</p>}<label className="field">{approve?'Izoh (ixtiyoriy)':'Pul tushmaganining sababi'}<textarea name="note" maxLength={1000} required={!approve} disabled={busy} placeholder={approve?'Bankdagi tushum tekshirildi':'Masalan: bank hisobida bu o‘tkazma topilmadi'}/></label>{error&&<p className="error-message" role="alert">{error}</p>}<div className="booking-actions"><button type="submit" className={approve?'button':'button button-danger'} disabled={busy}>{busy?'Saqlanmoqda...':approve?'Tasdiqlash va chipta chiqarish':'Pul tushmadi — rad etish'}</button><button type="button" className="button button-outline" disabled={busy} onClick={onClose}>Bekor qilish</button></div></form></dialog>;
}
export default function ReceiptReview({booking}) {
  const router=useRouter(),[busy,setBusy]=useState(false),[preview,setPreview]=useState(null),[decision,setDecision]=useState(null),[decisionError,setDecisionError]=useState(''),[outcome,setOutcome]=useState('');
  const payment=Array.isArray(booking.payments)?booking.payments[0]:booking.payments;
  async function open(){setBusy(true);try{const {data,error}=await browserClient().storage.from('payment-receipts').createSignedUrl(payment.receipt_path,120);if(error)throw error;if(!data?.signedUrl)throw new Error('Chek havolasi olinmadi.');setPreview({url:data.signedUrl,pdf:/\.pdf$/i.test(payment.receipt_path),reference:booking.reference,key:Date.now()});}catch(e){toast.error(e.message);}finally{setBusy(false);}}
  function retry(){setPreview(null);open();}
  function choose(approve){setDecisionError('');setDecision(approve);}
  async function review({approve,note}) {
    if(busy)return;
    if(!approve&&!note){setDecisionError('Rad etish sababini yozing.');return;}
    setBusy(true);setDecisionError('');
    try {
      const response=await fetch('/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'review_receipt',id:booking.id,data:{approve,note}})});
      const result=await response.json().catch(()=>{throw new Error('Server javobini o‘qib bo‘lmadi. Qayta urinib ko‘ring.');});
      if(!response.ok||result.error)throw new Error(result.error||'Amal bajarilmadi.');
      if(!['paid','rejected'].includes(result.data?.status))throw new Error('To‘lov holati tasdiqlanmadi. Sahifani yangilab qayta tekshiring.');
      setOutcome(result.data.status);setDecision(null);
      toast.success(result.data.already_confirmed?'Buyurtma avval tasdiqlangan.':result.data.status==='paid'?'Tasdiqlandi. QR chipta chiqarildi.':'Pul tushmadi: chek rad etildi.');router.refresh();
    }catch(e){setDecisionError(e.message);}finally{setBusy(false);}
  }
  if(booking.payment_method!=='card')return null;
  return <div><span className={`badge ${outcome==='paid'?'paid':outcome==='rejected'?'cancelled':''}`}>Karta · {outcome==='paid'?'Tasdiqlandi':outcome==='rejected'?'Pul tushmadi — rad etildi':payment?.status==='review'?'Tekshirish kutilmoqda':payment?.status||'Chek kutilmoqda'}</span>{payment?.receipt_path&&<button className="button button-outline" disabled={busy} onClick={open}>{busy?'Yuklanmoqda...':'Chekni ko‘rish'}</button>}{!outcome&&booking.status==='pending'&&payment?.status==='review'&&<><p className="fine-print">Chekning o‘zi yetarli emas: bankdagi tushumni tekshiring.</p><button className="button" disabled={busy} onClick={()=>choose(true)}>Pul tushdi — tasdiqlash</button><button className="button button-danger" disabled={busy} onClick={()=>choose(false)}>Pul tushmadi — rad etish</button></>}{preview&&<ReceiptViewer key={preview.key} preview={preview} onClose={()=>setPreview(null)} onRetry={retry}/>}{decision!==null&&<PaymentDecision approve={decision} booking={booking} busy={busy} error={decisionError} onClose={()=>setDecision(null)} onSubmit={review}/>}</div>;
}
