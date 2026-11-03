import { z } from 'zod';
import { authenticatedClient } from '@/lib/supabase/server';
import { checkOrigin, failure } from '@/lib/api';
export async function POST(request) {
  try {
    checkOrigin(request);
    const { db } = await authenticatedClient();
    const body = z.object({ event_id: z.string().uuid(), seat_ids: z.array(z.string().uuid()).min(1).max(8) }).parse(await request.json());
    const { data, error } = await db.rpc('reserve_seats', { p_event_id: body.event_id, p_seat_ids: body.seat_ids });
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch(e) { return failure(e); }
}
