'use client';
import { useEffect, useState } from 'react';
import { browserClient } from '@/lib/supabase/browser';
export default function ResetPassword() {
  const [recovery, setRecovery] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { setRecovery(new URLSearchParams(location.search).get('update') === '1'); }, []);
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
