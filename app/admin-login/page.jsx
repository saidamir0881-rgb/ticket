import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import AdminSignin from '@/components/site/admin-signin';
export const dynamic='force-dynamic';
export const metadata={title:'Administrator kirishi',robots:{index:false,follow:false}};
export default async function AdminLogin() {
  const db=await serverClient();
  const {data:{user}}=await db.auth.getUser();
  if(user) {
    const {data}=await db.from('profiles').select('role').eq('id',user.id).single();
    if(data?.role==='admin') redirect('/admin');
  }
  return <AdminSignin/>;
}
