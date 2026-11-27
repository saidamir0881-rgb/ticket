import { z } from 'zod';
import { authenticatedClient } from '@/lib/supabase/server';
import { checkOrigin, failure } from '@/lib/api';
export async function POST(request) {
  try {
    checkOrigin(request);
    const { db } = await authenticatedClient();
    const body = z.object({ event_id:z.string().uuid(),seat_ids:z.array(z.string().uuid()).min(1).max(8),payment_method:z.enum(['cash','card']),pickup_point_id:z.string().uuid().nullable(),promo_code:z.string().trim().max(24).optional() }).parse(await request.json());
    const { data, error } = await db.rpc('reserve_checkout', { p_event_id:body.event_id,p_seat_ids:body.seat_ids,p_payment_method:body.payment_method,p_pickup_point_id:body.pickup_point_id });
    if(error){if(error.code==='PGRST202')throw new Error('Yangi to‘lov migratsiyasi hali o‘rnatilmagan.');throw error;}
    if(body.promo_code){
      const {error:promoError}=await db.rpc('apply_booking_promo',{p_booking_id:data.id,p_code:body.promo_code});
      if(promoError){await db.rpc('cancel_booking',{p_booking_id:data.id});throw promoError;}
      const {data:updated,error:bookingError}=await db.from('bookings').select('id,total').eq('id',data.id).single();
      if(bookingError)throw bookingError;
      return Response.json({...data,total:updated.total},{status:201});
    }
    return Response.json(data, { status: 201 });
  } catch(e) { return failure(e); }
}
