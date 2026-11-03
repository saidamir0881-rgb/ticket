import AuthForm from '@/components/site/auth-form';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Hisobga kirish' };
export default async function Login() {
  const db=await serverClient();
  const {data:{user}}=await db.auth.getUser();
  if(user) {
    const {data}=await db.from('profiles').select('role').eq('id',user.id).single();
    // Keep the common login available to customers who want to switch accounts.
    if(data?.role==='admin') redirect('/admin');
  }
  return <AuthForm />;
}
