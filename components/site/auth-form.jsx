'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {z} from 'zod';
import {AlertTriangle,ArrowRight,CheckCircle2,ExternalLink,MessageCircle,RefreshCw} from 'lucide-react';
import {browserClient} from '@/lib/supabase/browser';
import {normalizeUzPhone} from '@/lib/phone';

const loginSchema=z.object({phone:z.string().trim().min(3,'Telefon raqamni kiriting.'),password:z.string().min(1,'Parolni kiriting.')});
const formatTime=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
function formatPhoneInput(value){
 const digits=String(value||'').replace(/\D/g,'').replace(/^998/,'').slice(0,9);
 return [digits.slice(0,2),digits.slice(2,5),digits.slice(5,7),digits.slice(7,9)].filter(Boolean).join(' ');
}

export default function AuthForm(){
 const router=useRouter();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[phoneInput,setPhoneInput]=useState(''),[password,setPassword]=useState('');
 const [step,setStep]=useState('credentials'),[sessionId,setSessionId]=useState(''),[telegramUrl,setTelegramUrl]=useState(''),[code,setCode]=useState(''),[expiresAt,setExpiresAt]=useState(0),[now,setNow]=useState(0);
 const remaining=expiresAt?Math.max(0,Math.ceil((expiresAt-now)/1000)):0,expired=step==='otp'&&remaining===0;
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{
  if(!sessionId||step==='credentials')return;
  let active=true;
  async function poll(){try{
   const response=await fetch(`/api/auth/telegram/status/${sessionId}`,{cache:'no-store'}),data=await response.json();
   if(!response.ok)throw new Error(data.error||'Tasdiqlash holatini tekshirib bo‘lmadi.');if(!active)return;
   if(data.status==='waiting_contact')setStep('telegram');
   else if(data.status==='otp_sent'){setStep('otp');setExpiresAt(data.expiresAt);setNow(Date.now());setError('');}
   else if(data.status==='expired'||data.status==='blocked'){setStep('otp');setExpiresAt(data.expiresAt);setNow(Date.now());setError(data.status==='blocked'?'Urinishlar tugadi. Yangi kod so‘rang.':'Kod muddati tugadi. Yangi kod so‘rang.');}
  }catch(e){if(active&&e.message!=='Failed to fetch')setError(e.message);}}
  poll();const timer=setInterval(poll,2500);return()=>{active=false;clearInterval(timer);};
 },[sessionId,step]);

 async function startLogin(e){
  e?.preventDefault();setBusy(true);setError('');
  try{
   const values=loginSchema.parse({phone:phoneInput,password}),normalized=normalizeUzPhone(values.phone);
   if(!normalized)throw new Error('Telefon raqamni +998 formatida to‘g‘ri kiriting.');
   setPhoneInput(normalized.slice(4));
   const response=await fetch('/api/auth/login/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:normalized,password:values.password})}),data=await response.json();
   if(!response.ok)throw new Error(data.error||'Kirishni boshlash imkoni bo‘lmadi.');
   setSessionId(data.sessionId);setTelegramUrl(data.telegramUrl||'');setExpiresAt(data.expiresAt);setNow(Date.now());setCode('');setStep(data.status==='otp_sent'?'otp':'telegram');
  }catch(e){setError(e instanceof z.ZodError?e.errors[0].message:e.message);}finally{setBusy(false);}
 }

 async function verifyAndLogin(e){
  e.preventDefault();setBusy(true);setError('');
  try{
   let response=await fetch('/api/auth/telegram/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,code})}),data=await response.json();
   if(!response.ok||data.status!=='verified')throw new Error(data.error||'Kod tasdiqlanmadi.');
   response=await fetch('/api/auth/login/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,phone:normalizeUzPhone(phoneInput)})});data=await response.json();
   if(!response.ok)throw new Error(data.error||'Telegram tasdiqlash yakunlanmadi.');
   const {error:loginError}=await browserClient().auth.signInWithPassword({phone:normalizeUzPhone(phoneInput),password});
   if(loginError)throw loginError;
   const destinationResponse=await fetch('/api/auth/destination',{cache:'no-store'}),destination=await destinationResponse.json();
   router.replace(destinationResponse.ok?destination.next:'/account');router.refresh();
  }catch(e){setError(e.message==='Invalid login credentials'?'Telefon raqam yoki parol noto‘g‘ri.':e.message);}finally{setBusy(false);}
 }

 const canResend=step==='telegram'||(step==='otp'&&(expired||error.includes('Urinishlar tugadi')));
 return <main className="auth-wrap"><span className="eyebrow">SIZNING SHAXSIY MAYDONINGIZ</span><h1>Qaytganingizdan xursandmiz.</h1><p className="lead">Barcha rejalaringiz va chiptalaringiz bir joyda.</p><div className="panel"><div className="auth-tabs"><Link className="active" href="/login">Kirish</Link><Link href="/register">Ro‘yxatdan o‘tish</Link></div>
  {error&&<p role="alert" className="error-message">{error}</p>}
  {step==='credentials'&&<form onSubmit={startLogin}><label className="field">Telefon raqam<div className="phone-login-control"><span className="phone-login-prefix" aria-label="O‘zbekiston telefon kodi"><span aria-hidden="true">🇺🇿</span><b>+998</b></span><input type="tel" inputMode="numeric" value={formatPhoneInput(phoneInput)} onChange={e=>setPhoneInput(e.target.value.replace(/\D/g,'').replace(/^998/,'').slice(0,9))} required autoComplete="tel" placeholder="90 123 45 67"/></div></label><label className="field">Parol<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" placeholder="Parolingiz"/></label><button className="button" disabled={busy}>{busy?'Tekshirilmoqda...':'Davom etish'}<ArrowRight size={17}/></button></form>}
  {step==='telegram'&&<><div className="telegram-verification-card"><span className="telegram-verification-icon"><MessageCircle size={20}/></span><div><strong>Telegram’da raqamni tasdiqlang</strong><p>Botni ochib Start bosing, keyin o‘z telefon raqamingizni ulashing.</p></div><a className="button button-small" href={telegramUrl} target="_blank" rel="noopener noreferrer">Botni ochish <ExternalLink size={14}/></a></div><button type="button" className="button button-outline telegram-resend" onClick={()=>startLogin()} disabled={busy}><RefreshCw size={15}/>Havolani yangilash</button></>}
  {step==='otp'&&<form onSubmit={verifyAndLogin}><p className="verified-note"><MessageCircle size={16}/>Telegram botga yuborilgan kodni kiriting.</p><label className="field">6 xonali tasdiqlash kodi<input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="000000" disabled={expired}/></label><p className="otp-security-warning"><AlertTriangle size={16}/>Kodni hech kimga bermang. Firibgarlar uni so‘rashi mumkin.</p><div className="otp-timer" role="timer">{expired?'Kod muddati tugadi':`Kod amal qilishiga ${formatTime(remaining)}`}</div><button className="button" disabled={busy||code.length!==6||expired}>{busy?'Tekshirilmoqda...':'Kodni tasdiqlash va kirish'}<CheckCircle2 size={17}/></button>{canResend&&<button type="button" className="button button-outline telegram-resend" onClick={()=>startLogin()} disabled={busy}><RefreshCw size={15}/>Yangi kod olish</button>}</form>}
  {step==='credentials'&&<p className="auth-note">Davom etish orqali <Link href="/help#privacy" className="purple">foydalanish shartlari va maxfiylik qoidalariga</Link> rozilik bildirasiz.</p>}
  <Link className="text-link" href="/reset-password">Parolni unutdingizmi?</Link>
 </div></main>;
}
