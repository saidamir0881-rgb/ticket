import {z} from 'zod';
import {authenticatedClient} from '@/lib/supabase/server';
import {checkOrigin,failure} from '@/lib/api';

export async function POST(request){
 try{checkOrigin(request);const {db}=await authenticatedClient();const body=z.object({booking_id:z.string().uuid(),reason:z.string().trim().min(5).max(1000)}).parse(await request.json());const {data,error}=await db.rpc('request_booking_refund',{p_booking_id:body.booking_id,p_reason:body.reason});if(error)throw error;return Response.json(data,{status:201});}catch(e){return failure(e);}
}
