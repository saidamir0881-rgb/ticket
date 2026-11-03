'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
export default function AdminSignin() {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[visible,setVisible]=useState(false);
  const router=useRouter();
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const form=new FormData(e.currentTarget),db=browserClient();
    try {
      const {data,error:authError}=await db.auth.signInWithPassword({email:String(form.get('email')).trim(),password:String(form.get('password'))});
      if(authError) throw authError;
      const {data:profile,error:profileError}=await db.from('profiles').select('role').eq('id',data.user.id).single();
      if(profileError) throw new Error('Profilni tekshirib bo‘lmadi. Qayta urinib ko‘ring.');
      if(profile?.role!=='admin') { setError('Bu hisobga administrator vakolati berilmagan. Vakolatni Supabase loyihasi egasi tayinlashi kerak.'); return; }
      router.replace('/admin'); router.refresh();
    } catch(e) { setError(e.message==='Invalid login credentials'?'Email yoki parol noto‘g‘ri.':e.message==='Email not confirmed'?'Avval emailingizni tasdiqlang.':e.message); }
    finally {setBusy(false);}
  }
  return <main className="admin-signin-wrap"><section className="admin-signin-story"><span className="admin-login-symbol"><ShieldCheck size={38} /></span><span className="eyebrow">UZTICKET · ADMINISTRATOR</span><h1>Har bir ajoyib tadbir<br />yaxshi boshqaruvdan<br />boshlanadi<span>.</span></h1><p>Tadbirlar, joylar, buyurtmalar va chiptalar — barchasi bitta ish maydonida.</p><div className="admin-login-features"><span><LockKeyhole size={15} />Himoyalangan kirish</span><span><ShieldCheck size={15} />Bitta vakolatli admin</span></div></section><section className="panel admin-signin-form"><span className="eyebrow">XUSH KELIBSIZ</span><h2>Admin hisobiga kirish</h2><p className="description">Supabase’da admin vakolati berilgan hisobingizdan foydalaning.</p>{error&&<p className="error-message" role="alert">{error}</p>}<form onSubmit={submit}><label className="field">Elektron pochta<input name="email" type="email" required autoComplete="username" placeholder="admin@gmail.com" disabled={busy} /></label><label className="field">Parol<span className="password-field"><input name="password" type={visible?'text':'password'} required autoComplete="current-password" placeholder="Parolingizni kiriting" disabled={busy} /><button type="button" aria-label={visible?'Parolni yashirish':'Parolni ko‘rsatish'} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label><button className="button" disabled={busy}>{busy?'Tekshirilmoqda...':'Boshqaruv paneliga kirish'}<ArrowRight size={17}/></button></form><Link className="text-link" href="/reset-password">Parolni tiklash</Link><div className="admin-signin-footer"><Link href="/">← Saytga qaytish</Link><Link href="/account">Shaxsiy kabinet</Link></div></section></main>;
}
