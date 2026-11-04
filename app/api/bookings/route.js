import { z } from 'zod';
import { authenticatedClient } from '@/lib/supabase/server';
import { checkOrigin, failure } from '@/lib/api';
import catalog from '@/lib/data/official-events.json';
export async function POST(request) {
  try {
    checkOrigin(request);
    const { db } = await authenticatedClient();
    const body = z.object({ event_id:z.string().uuid(),seat_ids:z.array(z.string().uuid()).min(1).max(8),payment_method:z.enum(['cash','card']),pickup_point_id:z.string().uuid().nullable() }).parse(await request.json());
    if(catalog.some(e=>e.id===body.event_id))return Response.json({error:'Ushbu tadbir chiptasi rasmiy sotuvchida olinadi.'},{status:400});
    const { data, error } = await db.rpc('reserve_checkout', { p_event_id:body.event_id,p_seat_ids:body.seat_ids,p_payment_method:body.payment_method,p_pickup_point_id:body.pickup_point_id });
    if(error){if(error.code==='PGRST202')throw new Error('Yangi to‘lov migratsiyasi hali o‘rnatilmagan.');throw error;}
    return Response.json(data, { status: 201 });
  } catch(e) { return failure(e); }
}
