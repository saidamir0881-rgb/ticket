'use client';
import {useEffect,useRef,useState} from 'react';
import {CreditCard,X,Copy,Upload} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {money} from '@/lib/format';
export default function CardTransfer({booking,userId,onClose,onSubmitted}) {
  const dialog=useRef(null),[settings,setSettings]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[file,setFile]=useState(null),[copied,setCopied]=useState(false);
  useEffect(()=>{dialog.current.showModal();let active=true;fetch('/api/checkout-options',{cache:'no-store'}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);if(!data.settings)throw new Error('Qabul qiluvchi karta hali sozlanmagan.');if(active)setSettings(data.settings);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  async function submit(e) {
    e.preventDefault();setError('');
    if(!file||!['image/jpeg','image/png','application/pdf'].includes(file.type)||file.size>5242880){setError('JPG, PNG yoki PDF chek yuklang. Hajmi 5 MB gacha.');return;}
    const last4=new FormData(e.currentTarget).get('last4');setBusy(true);
    try {
      const path=`${userId}/${booking.id}/${crypto.randomUUID()}.${file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg'}`;
      const {error:uploadError}=await browserClient().storage.from('payment-receipts').upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;
      const response=await fetch(`/api/bookings/${booking.id}/receipt`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({receipt_path:path,card_last4:last4||null})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);onSubmitted(data.booking);onClose();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function copy(){try{await navigator.clipboard.writeText(settings.recipient_card);setCopied(true);}catch{setError('Raqamni belgilang va qo‘lda nusxalang.');}}
  return <dialog ref={dialog} className="payment-dialog" aria-labelledby="transfer-title" onCancel={e=>{if(busy)e.preventDefault();else onClose();}}><div className="payment-heading"><span className="payment-symbol"><CreditCard size={25}/></span><button className="icon-button" disabled={busy} onClick={onClose} aria-label="Yopish"><X/></button></div><h2 id="transfer-title">Karta orqali to‘lash</h2><p className="description">{booking.reference} · <strong>{money(booking.total)}</strong><br/>Pul avtomatik yechilmaydi. Bankingiz ilovasidan quyidagi kartaga o‘tkazing.</p>{settings&&<div className="recipient-card"><small>{settings.bank_name||'Qabul qiluvchi karta'}</small><strong>{settings.recipient_card.replace(/(.{4})/g,'$1 ').trim()}</strong><span>{settings.recipient_name}</span><button type="button" onClick={copy}><Copy size={14}/>{copied?'Nusxalandi':'Raqamni nusxalash'}</button>{settings.instructions&&<p>{settings.instructions}</p>}</div>}<form onSubmit={submit}><label className="field">To‘lagan kartangizning oxirgi 4 raqami (ixtiyoriy)<input name="last4" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="1234" autoComplete="off" disabled={busy}/><small>To‘liq karta raqami, amal qilish muddati yoki CVV kerak emas.</small></label><label className="field"><span><Upload size={15}/> To‘lov cheki</span><input type="file" accept="image/jpeg,image/png,application/pdf" required disabled={busy} onChange={e=>setFile(e.target.files[0])}/></label>{error&&<p role="alert" className="error-message">{error}</p>}<p className="notice">Admin bankdagi tushumni chek bilan tekshiradi va 24 soat ichida qaror qiladi. Tasdiqlangach, chipta va QR avtomatik ko‘rinadi.</p><button className="button" disabled={!settings||busy||!file}>{busy?'Chek yuborilmoqda...':'Chekni tekshirishga yuborish'}</button></form></dialog>;
}
