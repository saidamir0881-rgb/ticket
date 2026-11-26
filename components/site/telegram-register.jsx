'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight,CheckCircle2,ExternalLink,MessageCircle,RefreshCw,ShieldCheck} from 'lucide-react';
import {toast} from 'sonner';
import {browserClient} from '@/lib/supabase/browser';
import {normalizeUzPhone} from '@/lib/phone';

const formatTime=seconds=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;

export default function TelegramRegister(){
 const router=useRouter();
 const [phone,setPhone]=useState('+998 '),[sessionId,setSessionId]=useState(''),[telegramUrl,setTelegramUrl]=useState(''),[expiresAt,setExpiresAt]=useState(0),[now,setNow]=useState(0);
 const [step,setStep]=useState('phone'),[code,setCode]=useState(''),[verified,setVerified]=useState(false),[created,setCreated]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const remaining=expiresAt?Math.max(0,Math.ceil((expiresAt-now)/1000)):0;

 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
  if(!sessionId||verified||step==='profile')return;
  let active=true;
  async function poll(){
   try{
    const response=await fetch(`/api/auth/telegram/status/${sessionId}`,{cache:'no-store'}),data=await response.json();
    if(!response.ok)throw new Error(data.error||'Tasdiqlash holatini tekshirib bo‘lmadi.');
    if(!active)return;
    if(data.status==='otp_sent'){setStep('otp');setExpiresAt(data.expiresAt);setNow(Date.now());setError('');}
    else if(data.status==='waiting_contact')setStep('telegram');
    else if(data.status==='blocked'){setStep('otp');setExpiresAt(data.expiresAt);setNow(Date.now());setError('Urinishlar tugadi. Yangi kod so‘rang.');}
    else if(data.status==='expired'){setStep('otp');setExpiresAt(data.expiresAt);setNow(Date.now());setError('Kod muddati tugadi. Yangi kod so‘rang.');}
   }catch(e){if(active&&e.message!=='Failed to fetch')setError(e.message);}
  }
  poll();const timer=setInterval(poll,2500);
  return()=>{active=false;clearInterval(timer);};
 },[sessionId,verified,step]);

 async function startVerification(e){
  e?.preventDefault();setBusy(true);setError('');setSuccess('');
  try{
   const normalized=normalizeUzPhone(phone);if(!normalized)throw new Error('Telefon raqamni +998 formatida to‘g‘ri kiriting.');
   setPhone(normalized);
   const response=await fetch('/api/auth/telegram/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:normalized})}),data=await response.json();
   if(!response.ok)throw new Error(data.error||'Tasdiqlash havolasi yaratilmadi.');
   setSessionId(data.sessionId);setTelegramUrl(data.telegramUrl);setExpiresAt(data.expiresAt);setNow(Date.now());setCode('');setStep('telegram');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }

 async function verify(e){
  e.preventDefault();setBusy(true);setError('');
  try{
   const response=await fetch('/api/auth/telegram/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,code})}),data=await response.json();
   if(!response.ok)throw new Error(data.error||'Kod tasdiqlanmadi.');
   if(data.status!=='verified')throw new Error('Telefon tasdiqlanmadi.');
   setVerified(true);setStep('profile');setExpiresAt(0);toast.success('Telefon raqamingiz tasdiqlandi.');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }

 async function register(e){
  e.preventDefault();setBusy(true);setError('');setSuccess('');
  const fields=Object.fromEntries(new FormData(e.currentTarget));
  if(fields.password!==fields.passwordConfirm){setError('Parollar bir xil emas.');setBusy(false);return;}
  try{
   const response=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,phone:normalizeUzPhone(phone),firstName:fields.firstName,lastName:fields.lastName,password:fields.password})}),data=await response.json();
   if(!response.ok)throw new Error(data.error||'Akkaunt yaratilmadi.');
   const {error:loginError}=await browserClient().auth.signInWithPassword({phone:data.phone,password:fields.password});
   if(loginError){setCreated(true);setSuccess('Akkaunt yaratildi. Endi telefon raqamingiz va parolingiz bilan kiring.');return;}
   setCreated(true);setSuccess('Akkaunt yaratildi. Shaxsiy kabinetingiz ochilmoqda...');
   router.replace('/account');router.refresh();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }

 const expired=step==='otp'&&remaining===0,canResend=step==='telegram'||(step==='otp'&&(expired||error.includes('Urinishlar tugadi')));
 return <main className="auth-wrap telegram-auth-wrap"><span className="eyebrow"><ShieldCheck size={14}/> TELEGRAM ORQALI TASDIQLASH</span><h1>Akkaunt yarating<span className="purple">.</span></h1><p className="lead">Telefon raqamingizni Telegram orqali tasdiqlab, chiptalaringizni bitta joyda saqlang.</p><div className="panel telegram-register-panel"><div className="auth-tabs"><Link href="/login">Kirish</Link><Link className="active" href="/register">Ro‘yxatdan o‘tish</Link></div>
  <div className="telegram-step-indicator" aria-label="Ro‘yxatdan o‘tish bosqichi"><span className={step==='phone'||step==='telegram'||step==='otp'?'current':''}><i>1</i>Telefon</span><b/><span className={verified?'current':''}><i>{verified?'✓':'2'}</i>Akkaunt</span></div>
  {error&&<p role="alert" className="error-message">{error}</p>}{success&&<p role="status" className="success-message">{success} <Link href="/login">Kirish sahifasi</Link></p>}
  {!verified&&<form onSubmit={step==='otp'?verify:startVerification}><label className="field">Telefon raqamingiz<input type="tel" name="phone" value={phone} onChange={e=>setPhone(e.target.value)} required autoComplete="tel" placeholder="+998 90 123 45 67" disabled={step!=='phone'}/><small>Telegram’da shu raqamga tegishli akkaunt bo‘lishi kerak.</small></label>
   {step==='phone'?<button className="button" disabled={busy}>{busy?'Tayyorlanmoqda...':'Telefon raqamni tekshirish'}<ArrowRight size={17}/></button>:<>
    {step==='telegram'&&<div className="telegram-verification-card"><span className="telegram-verification-icon"><MessageCircle size={21}/></span><div><strong>Telegram’da davom eting</strong><p>Botni ochib Start bosing, keyin telefon raqamingizni ulashing.</p></div><a className="button button-small" href={telegramUrl} target="_blank" rel="noopener noreferrer">Botni ochish <ExternalLink size={14}/></a></div>}
    {step==='otp'&&<div className="otp-entry"><label className="field">6 xonali tasdiqlash kodi<input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" disabled={expired}/></label><div className="otp-timer" role="timer">{expired?'Kod muddati tugadi':`Kod amal qilishiga ${formatTime(remaining)}`}</div><button type="submit" className="button" disabled={busy||code.length!==6||expired}>{busy?'Tekshirilmoqda...':'Kodni tasdiqlash'}<CheckCircle2 size={17}/></button></div>}
    {canResend&&<button type="button" className="button button-outline telegram-resend" onClick={startVerification} disabled={busy}><RefreshCw size={15}/>{busy?'Yuborilmoqda...':step==='telegram'?'Havolani yangilash':'Yangi kod olish'}</button>}
   </>}
  </form>}
  {verified&&!created&&<form onSubmit={register}><p className="verified-note"><CheckCircle2 size={16}/>Telefon raqamingiz tasdiqlandi: <strong>{normalizeUzPhone(phone)}</strong></p><div className="form-grid"><label className="field">Ism<input name="firstName" required maxLength={50} autoComplete="given-name" placeholder="Ismingiz"/></label><label className="field">Familiya<input name="lastName" required maxLength={50} autoComplete="family-name" placeholder="Familiyangiz"/></label></div><label className="field">Parol<input type="password" name="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Kamida 8 ta belgi"/></label><label className="field">Parolni takrorlang<input type="password" name="passwordConfirm" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Parolni qayta kiriting"/></label><button className="button" disabled={busy}>{busy?'Akkaunt yaratilmoqda...':'Ro‘yxatdan o‘tish'}<ArrowRight size={17}/></button></form>}
  <p className="auth-note">Davom etish orqali <Link href="/help#privacy" className="purple">foydalanish shartlari va maxfiylik qoidalariga</Link> rozilik bildirasiz.</p>
 </div></main>;
}
