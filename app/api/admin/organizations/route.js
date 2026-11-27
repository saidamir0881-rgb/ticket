import {z} from 'zod';
import {authenticatedClient} from '@/lib/supabase/server';
import {serviceClient} from '@/lib/supabase/service';
import {checkOrigin,failure} from '@/lib/api';

export async function POST(request){
 try{checkOrigin(request);await authenticatedClient(true);const body=z.object({name:z.string().trim().min(2).max(150),user_id:z.string().uuid()}).parse(await request.json());const db=serviceClient();const {data:profile,error:profileError}=await db.from('profiles').select('id,role').eq('id',body.user_id).maybeSingle();if(profileError)throw profileError;if(!profile)throw new Error('Foydalanuvchi profili topilmadi.');if(profile.role==='admin')throw new Error('Admin hisobini tashkilotchi roliga o‘tkazib bo‘lmaydi.');const {data:org,error}=await db.from('organizations').insert({name:body.name,owner_id:body.user_id}).select('id,name').single();if(error)throw error;const {error:memberError}=await db.from('organization_members').insert({organization_id:org.id,user_id:body.user_id,role:'owner'});if(memberError){await db.from('organizations').delete().eq('id',org.id);throw memberError;}const {error:roleError}=await db.from('profiles').update({role:'organizer'}).eq('id',body.user_id);if(roleError){await db.from('organizations').delete().eq('id',org.id);throw roleError;}return Response.json({organization:org},{status:201});}catch(e){return failure(e);}
}
export async function PATCH(request){
 try{checkOrigin(request);await authenticatedClient(true);const body=z.object({organization_id:z.string().uuid(),event_id:z.string().uuid()}).parse(await request.json());const db=serviceClient();const {data,error}=await db.from('events').update({organization_id:body.organization_id}).eq('id',body.event_id).select('id,title').single();if(error)throw error;return Response.json({event:data});}catch(e){return failure(e);}
}
