import {z} from 'zod';
import {authenticatedClient} from '@/lib/supabase/server';
import {serviceClient} from '@/lib/supabase/service';
import {checkOrigin,failure} from '@/lib/api';

export async function GET(){try{await authenticatedClient(true);const db=serviceClient();const {data,error}=await db.from('promo_codes').select('id,code,discount_type,discount_value,max_uses,uses,expires_at,active').order('created_at',{ascending:false}).limit(100);if(error)throw error;return Response.json({promos:data||[]});}catch(e){return failure(e);}}
export async function POST(request){
 try{checkOrigin(request);const {user}=await authenticatedClient(true);const body=z.object({code:z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,24}$/),discount_type:z.enum(['percent','fixed']),discount_value:z.number().int().positive().max(1000000000),max_uses:z.number().int().positive().nullable(),expires_at:z.string().datetime({offset:true}).nullable()}).parse(await request.json());if(body.discount_type==='percent'&&body.discount_value>90)throw new Error('Foizli chegirma 90% dan oshmasin.');const db=serviceClient();const {data,error}=await db.from('promo_codes').insert({...body,created_by:user.id}).select('id,code,discount_type,discount_value,max_uses,expires_at,active').single();if(error)throw error;return Response.json({data},{status:201});}catch(e){return failure(e);}
}
