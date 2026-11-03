import { z } from 'zod';
import { authenticatedClient } from '@/lib/supabase/server';
import { checkOrigin, failure } from '@/lib/api';
export async function DELETE(request, { params }) {
  try {
    checkOrigin(request);
    const { id } = await params;
    z.string().uuid().parse(id);
    const { db } = await authenticatedClient();
    const { data, error } = await db.rpc('cancel_booking', { p_booking_id: id });
    if (error) throw error;
    return Response.json(data);
  } catch(e) { return failure(e); }
}
