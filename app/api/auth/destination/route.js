import { authenticatedClient } from '@/lib/supabase/server';
import { failure } from '@/lib/api';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const { db, user } = await authenticatedClient();
    const { data, error } = await db.from('profiles').select('role').eq('id', user.id).single();
    if (error) throw new Error('Profilni yuklab bo‘lmadi. Qayta urinib ko‘ring.');
    return Response.json({ next: data.role === 'admin' ? '/admin' : '/account' }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) { return failure(e); }
}
