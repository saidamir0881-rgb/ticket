import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseUrl, supabaseKey } from './config';
export async function serverClient() {
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: values => { try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server components cannot mutate cookies; proxy refreshes them. */ } },
    },
  });
}
export async function authenticatedClient(admin = false) {
  const db = await serverClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw Object.assign(new Error('Avval hisobingizga kiring.'), { status: 401 });
  if (admin) {
    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') throw Object.assign(new Error('Admin ruxsati kerak.'), { status: 403 });
  }
  return { db, user };
}
