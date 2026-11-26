'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
import {normalizeUzPhone} from '@/lib/phone';
const loginSchema=z.object({identifier:z.string().trim().min(3,'Telefon yoki email kiriting.'),password:z.string().min(1,'Parolni kiriting.')});
export default function AuthForm() {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const router = useRouter();
  async function submit(e) {
    e.preventDefault();setError('');setBusy(true);
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const values=loginSchema.parse({identifier:fields.identifier,password:fields.password}),db=browserClient();
      const identifier=values.identifier;
      const credentials=identifier.includes('@')?{email:identifier,password:values.password}:{phone:normalizeUzPhone(identifier),password:values.password};
      if(!credentials.email&&!credentials.phone)throw new Error('Telefon raqamni +998 formatida kiriting.');
      const result=await db.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      const response=await fetch('/api/auth/destination',{cache:'no-store'}),destination=await response.json();
      if(!response.ok)throw new Error(destination.error||'Hisob vakolatini tekshirib bo‘lmadi.');
      router.replace(destination.next);router.refresh();
    } catch (e) { setError(e instanceof z.ZodError?e.errors[0].message:e.message==='Invalid login credentials'?'Telefon/email yoki parol noto‘g‘ri.':e.message); }
    finally { setBusy(false); }
  }
  return <main className="auth-wrap"><span className="eyebrow">SIZNING SHAXSIY MAYDONINGIZ</span><h1>Qaytganingizdan xursandmiz.</h1><p className="lead">Barcha rejalaringiz va chiptalaringiz bir joyda.</p><div className="panel"><div className="auth-tabs"><Link className="active" href="/login">Kirish</Link><Link href="/register">Ro‘yxatdan o‘tish</Link></div>{error&&<p role="alert" className="error-message">{error}</p>}<form onSubmit={submit}><label className="field">Telefon raqam yoki email<input type="text" name="identifier" required autoComplete="username" placeholder="+998 90 123 45 67 yoki email"/></label><label className="field">Parol<input type="password" name="password" required autoComplete="current-password" placeholder="Parolingiz"/></label><button className="button" disabled={busy}>{busy?'Kutilmoqda...':'Hisobga kirish'}<ArrowRight size={17}/></button></form><p className="auth-note">Davom etish orqali <Link href="/help#privacy" className="purple">foydalanish shartlari va maxfiylik qoidalariga</Link> rozilik bildirasiz.</p><Link className="text-link" href="/reset-password">Parolni unutdingizmi?</Link></div></main>;
}
