'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
const schema = z.object({ email: z.string().email('To‘g‘ri email kiriting.'), password: z.string().min(8, 'Parol kamida 8 belgidan iborat bo‘lsin.') });
export default function AuthForm({ register = false }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const router = useRouter();
  async function submit(e) {
    e.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const values = schema.parse(fields), db = browserClient();
      const result = register ? await db.auth.signUp({ ...values, options: { data: { full_name: fields.full_name }, emailRedirectTo: `${location.origin}/auth/callback` } }) : await db.auth.signInWithPassword(values);
      if (result.error) throw result.error;
      if (register && !result.data.session) setSuccess('Tasdiqlash xati yuborildi. Emaildagi havolani oching, keyin hisobingizga kiring.');
      else { router.push('/account'); router.refresh(); }
    } catch (e) { setError(e instanceof z.ZodError ? e.errors[0].message : e.message === 'Invalid login credentials' ? 'Email yoki parol noto‘g‘ri.' : e.message); }
    finally { setBusy(false); }
  }
  return <main className="auth-wrap"><span className="eyebrow">SIZNING SHAXSIY MAYDONINGIZ</span><h1>{register ? 'Xush kelibsiz.' : 'Qaytganingizdan xursandmiz.'}</h1><p className="lead">Barcha rejalaringiz va chiptalaringiz bir joyda.</p><div className="panel"><div className="auth-tabs"><Link className={!register ? 'active' : ''} href="/login">Kirish</Link><Link className={register ? 'active' : ''} href="/register">Ro‘yxatdan o‘tish</Link></div>{error && <p role="alert" className="error-message">{error}</p>}{success && <p role="status" className="success-message">{success}</p>}<form onSubmit={submit}>{register && <label className="field">Ismingiz<input name="full_name" required maxLength={100} autoComplete="name" placeholder="Ism Familiya" /></label>}<label className="field">Elektron pochta<input type="email" name="email" required autoComplete="email" placeholder="siz@example.com" /></label><label className="field">Parol<input type="password" name="password" required minLength={8} autoComplete={register ? 'new-password' : 'current-password'} placeholder="Kamida 8 ta belgi" /></label><button className="button" disabled={busy}>{busy ? 'Kutilmoqda...' : register ? 'Hisob ochish' : 'Hisobga kirish'}<ArrowRight size={17} /></button></form><p className="auth-note">Davom etish orqali <Link href="/help#privacy" className="purple">foydalanish shartlari va maxfiylik qoidalariga</Link> rozilik bildirasiz.</p>{!register && <Link className="text-link" href="/reset-password">Parolni unutdingizmi?</Link>}</div></main>;
}
