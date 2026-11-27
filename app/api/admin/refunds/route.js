import {z} from 'zod';
import {authenticatedClient} from '@/lib/supabase/server';
import {checkOrigin,failure} from '@/lib/api';

export async function GET(){try{const {db}=await authenticatedClient(true);const {data,error}=await db.from('refund_requests').select('*,booking:bookings(reference,total,payment_method,event:events(title))').order('requested_at',{ascending:false});if(error)throw error;return Response.json({refunds:data||[]});}catch(e){return failure(e);}}
export async function PATCH(request){
 try{checkOrigin(request);const {db,user}=await authenticatedClient(true);const body=z.object({id:z.string().uuid(),status:z.enum(['approved','rejected','refunded']),admin_note:z.string().max(1000).default('')}).parse(await request.json());if(body.status==='refunded'&&!body.admin_note.trim())throw new Error('Pul amalda qaytarilganini tasdiqlovchi izoh kiriting.');const {data,error}=await db.from('refund_requests').update({status:body.status,admin_note:body.admin_note,resolved_at:new Date().toISOString(),resolved_by:user.id}).eq('id',body.id).in('status',['pending','approved']).select('id,status').single();if(error)throw error;return Response.json({data});}catch(e){return failure(e);}
}
