'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { browserClient } from '@/lib/supabase/browser';
export default function ResetPassword() {
  return <Suspense fallback={<p role="status">Yuklanmoqda...</p>}><ResetPasswordForm /></Suspense>;
}
function ResetPasswordForm() {
  const recovery = useSearchParams().get('update') === '1';
  const [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const values = new FormData(e.currentTarget), db = browserClient();
      const result = recovery ? await db.auth.updateUser({ password: values.get('password') }) : await db.auth.resetPasswordForEmail(values.get('email'), { redirectTo: `${location.origin}/auth/callback?next=/reset-password?update=1` });
      if (result.error) throw result.error;
      setMessage(recovery ? 'Parol yangilandi. Endi hisobingizga kirishingiz mumkin.' : 'Hisob mavjud bo‘lsa, tiklash havolasi emailingizga yuboriladi.');
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="auth-wrap"><h1>Parolni tiklash</h1><div className="panel">{message && <p className="success-message">{message}</p>}{error && <p className="error-message" role="alert">{error}</p>}<form onSubmit={submit}><label className="field">{recovery ? 'Yangi parol' : 'Email'}<input type={recovery ? 'password' : 'email'} name={recovery ? 'password' : 'email'} required minLength={recovery ? 8 : undefined} /></label><button className="button" disabled={busy}>{busy ? 'Kutilmoqda...' : recovery ? 'Parolni saqlash' : 'Havola yuborish'}</button></form></div></main>;
}
