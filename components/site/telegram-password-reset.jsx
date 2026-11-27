'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {AlertTriangle,ArrowRight,CheckCircle2,ExternalLink,MessageCircle,RefreshCw,ShieldCheck} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';

const formatTime=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function formatPhoneInput(value){
 const digits=String(value||'').replace(/\D/g,'').replace(/^998/,'').slice(0,9);
 return [digits.slice(0,2),digits.slice(2,5),digits.slice(5,7),digits.slice(7,9)].filter(Boolean).join(' ');
}
export default function TelegramPasswordReset(){
 const router=useRouter();
 const [phone,setPhone]=useState(''),[sessionId,setSessionId]=useState(''),[telegramUrl,setTelegramUrl]=useState(''),[expiresAt,setExpiresAt]=useState(0),[now,setNow]=useState(0);
 const [step,setStep]=useState('phone'),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const remaining=expiresAt?Math.max(0,Math.ceil((expiresAt-now)/1000)):0,expired=step==='otp'&&remaining===0;
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
  if(!sessionId||step==='password'||step==='done')return;
  let active=true;
  async function poll(){try{
   const response=await fetch(`/api/auth/telegram/status/${sessionId}`,{cache:'no-store'}),data=await response.json();
   if(!response.ok)throw new Error(data.error||'Tasdiqlash holatini tekshirib bo‘lmadi.');if(!active)return;
   if(data.status==='waiting_contact')setStep('telegram');
   else if(data.status==='otp_sent'){setStep('otp');setExpiresAt(data.expiresAt);setNow(Date.now());setError('');}
   else if(data.status==='verified')setStep('password');
   else if(data.status==='blocked'||data.status==='expired'){setStep('otp');setExpiresAt(data.expiresAt);setNow(Date.now());setError(data.status==='blocked'?'Urinishlar tugadi. Yangi tasdiqlashni boshlang.':'Kod muddati tugadi. Yangi kod so‘rang.');}
  }catch(e){if(active&&e.message!=='Failed to fetch')setError(e.message);}}
  poll();const timer=setInterval(poll,2500);return()=>{active=false;clearInterval(timer);};
 },[sessionId,step]);
 async function startVerification(e){
  e?.preventDefault();setBusy(true);setError('');setSuccess('');
  try{
   const digits=phone.replace(/\D/g,'');const normalized=digits.length===9?`+998${digits}`:digits.length===12&&digits.startsWith('998')?`+${digits}`:null;
   if(!normalized)throw new Error('Telefon raqamni +998 formatida to‘g‘ri kiriting.');setPhone(normalized);
   const response=await fetch('/api/auth/password/reset/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:normalized})}),data=await response.json();
   if(!response.ok)throw new Error(data.error||'Tasdiqlash havolasi yaratilmadi.');
   setSessionId(data.sessionId);setTelegramUrl(data.telegramUrl||'');setExpiresAt(data.expiresAt);setNow(Date.now());setCode('');setStep(data.needsLink?'telegram':'otp');
  }catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function verify(e){
  e.preventDefault();setBusy(true);setError('');
  try{const response=await fetch('/api/auth/telegram/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,code})}),data=await response.json();if(!response.ok)throw new Error(data.error||'Kod tasdiqlanmadi.');if(data.status!=='verified')throw new Error('Telefon tasdiqlanmadi.');setStep('password');setExpiresAt(0);}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 async function reset(e){
  e.preventDefault();setBusy(true);setError('');setSuccess('');const fields=Object.fromEntries(new FormData(e.currentTarget));
  if(fields.password!==fields.passwordConfirm){setError('Parollar bir xil emas.');setBusy(false);return;}
  try{const response=await fetch('/api/auth/password/reset',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,phone,password:fields.password})}),data=await response.json();if(!response.ok)throw new Error(data.error||'Parolni yangilab bo‘lmadi.');if(!data.updated)throw new Error('Parol yangilanmadi.');const {error:loginError}=await browserClient().auth.signInWithPassword({email:data.loginEmail,password:fields.password});if(loginError){setStep('done');setSuccess('Parol yangilandi. Avtomatik kirish bo‘lmadi — yangi parol bilan qayta kiring.');return;}router.replace('/account');router.refresh();}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 const canResend=step==='telegram'||(step==='otp'&&(expired||error.includes('Urinishlar tugadi')));
 return <main className="auth-wrap telegram-auth-wrap"><span className="eyebrow"><ShieldCheck size={14}/> TELEGRAM ORQALI PAROLNI TIKLASH</span><h1>Parolni tiklash<span className="purple">.</span></h1><p className="lead">Telefon raqamingizni Telegram orqali tasdiqlang va yangi parol o‘rnating.</p><div className="panel telegram-register-panel"><div className="auth-tabs"><Link href="/login">Kirish</Link><Link href="/register">Ro‘yxatdan o‘tish</Link></div>
  {error&&<p role="alert" className="error-message">{error}</p>}{success&&<p role="status" className="success-message">{success} <Link href="/login">Kirish</Link></p>}
  {step==='phone'&&<form onSubmit={startVerification}><label className="field">Telefon raqamingiz<div className="phone-login-control"><span className="phone-login-prefix" aria-label="O‘zbekiston telefon kodi"><span aria-hidden="true">🇺🇿</span><b>+998</b></span><input type="tel" inputMode="numeric" value={formatPhoneInput(phone)} onChange={e=>setPhone(e.target.value.replace(/\D/g,'').replace(/^998/,'').slice(0,9))} required autoComplete="tel" placeholder="90 123 45 67"/></div><small>Kod shu raqamga bog‘langan Telegram bot chatiga yuboriladi.</small></label><button className="button" disabled={busy}>{busy?'Yuborilmoqda...':'Telegram kodini yuborish'}<ArrowRight size={17}/></button></form>}
  {step==='telegram'&&<><p className="verified-note"><MessageCircle size={16}/>Botga kirib Start bosing, so‘ng o‘z telefon raqamingizni ulashing.</p><a className="button" href={telegramUrl} target="_blank" rel="noopener noreferrer">Telegram botni ochish <ExternalLink size={15}/></a>{canResend&&<button type="button" className="button button-outline telegram-resend" onClick={startVerification} disabled={busy}><RefreshCw size={15}/>Havolani yangilash</button>}</>}
  {step==='otp'&&<form onSubmit={verify}><label className="field">6 xonali tasdiqlash kodi<input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" disabled={expired}/></label><p className="otp-security-warning"><AlertTriangle size={16}/>Kodni hech kimga bermang. Firibgarlar uni so‘rashi mumkin.</p><div className="otp-timer" role="timer">{expired?'Kod muddati tugadi':`Kod amal qilishiga ${formatTime(remaining)}`}</div><button className="button" disabled={busy||code.length!==6||expired}>{busy?'Tekshirilmoqda...':'Kodni tasdiqlash'}<CheckCircle2 size={17}/></button>{canResend&&<button type="button" className="button button-outline telegram-resend" onClick={startVerification} disabled={busy}><RefreshCw size={15}/>Yangi kod olish</button>}</form>}
  {step==='password'&&<form onSubmit={reset}><p className="verified-note"><CheckCircle2 size={16}/>Telefon raqamingiz tasdiqlandi.</p><label className="field">Yangi parol<input type="password" name="password" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Kamida 8 ta belgi"/></label><label className="field">Parolni takrorlang<input type="password" name="passwordConfirm" required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Parolni qayta kiriting"/></label><button className="button" disabled={busy}>{busy?'Saqlanmoqda...':'Yangi parolni saqlash'}<ArrowRight size={17}/></button></form>}
  {step==='done'&&<p className="verified-note"><CheckCircle2 size={16}/>Tiklash yakunlandi. <Link href="/login">Kirish sahifasiga o‘tish</Link></p>}
  <p className="auth-note">Akkauntingiz yo‘qmi? <Link href="/register" className="purple">Ro‘yxatdan o‘ting</Link></p>
 </div></main>;
}
