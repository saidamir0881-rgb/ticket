import {z} from 'zod';
import {authenticatedClient} from '@/lib/supabase/server';
import {checkOrigin,failure} from '@/lib/api';
export async function POST(request,{params}) {
  try {
    checkOrigin(request);
    const {db,user}=await authenticatedClient();
    const {id}=await params;z.string().uuid().parse(id);
    // The browser submits a fixture identifier, never any card number or CVV.
    const {test_card}=z.object({test_card:z.enum(['success','declined'])}).strict().parse(await request.json());
    const {data,error}=await db.rpc('pay_demo_card',{p_booking_id:id,p_test_card:test_card});
    if(error) {
      if(error.code==='PGRST202') throw new Error('Demo to‘lov hali yoqilmagan. Administrator yangi to‘lov migratsiyasini o‘rnatishi kerak.');
      throw error;
    }
    if(data.error) throw new Error(data.error);
    const result=await db.from('bookings').select('id,status,updated_at,tickets(*),payments(method)').eq('id',id).eq('user_id',user.id).single();
    if(result.error) throw result.error;
    return Response.json({booking:result.data},{headers:{'Cache-Control':'private, no-store'}});
  } catch(e) {return failure(e);}
}
