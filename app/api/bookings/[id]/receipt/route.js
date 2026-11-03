import {z} from 'zod';
import {authenticatedClient} from '@/lib/supabase/server';
import {checkOrigin,failure} from '@/lib/api';
export async function POST(request,{params}) {
  try {
    checkOrigin(request);const {db,user}=await authenticatedClient();const {id}=await params;z.string().uuid().parse(id);
    const body=z.object({receipt_path:z.string().min(1).max(500),card_last4:z.string().regex(/^[0-9]{4}$/).nullable()}).parse(await request.json());
    const {data,error}=await db.rpc('submit_card_receipt',{p_booking_id:id,p_receipt_path:body.receipt_path,p_card_last4:body.card_last4});
    if(error)throw error;if(data.error)throw new Error(data.error);
    const result=await db.from('bookings').select('id,status,expires_at,updated_at,payments(*)').eq('id',id).eq('user_id',user.id).single();
    if(result.error)throw result.error;
    return Response.json({booking:result.data},{headers:{'Cache-Control':'private, no-store'}});
  }catch(e){return failure(e);}
}
