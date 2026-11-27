import {z} from 'zod';
import {authenticatedClient} from '@/lib/supabase/server';
import {checkOrigin,failure} from '@/lib/api';

export async function GET(){
  try{const {db,user}=await authenticatedClient();const {data,error}=await db.from('favorite_events').select('event_id,notify,event:events(title,starts_at)').eq('user_id',user.id);if(error)throw error;return Response.json({favorites:data||[]},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}
}
export async function POST(request){
  try{
    checkOrigin(request);const {db,user}=await authenticatedClient();
    const body=z.discriminatedUnion('action',[
      z.object({action:z.literal('toggle'),event_id:z.string().uuid(),notify:z.boolean().optional()}),
      z.object({action:z.literal('sync'),event_ids:z.array(z.string().uuid()).max(500)}),
      z.object({action:z.literal('notify'),event_id:z.string().uuid(),notify:z.boolean()}),
    ]).parse(await request.json());
    if(body.action==='sync'){
      if(body.event_ids.length) {const rows=body.event_ids.map(event_id=>({user_id:user.id,event_id,notify:true}));const {error}=await db.from('favorite_events').upsert(rows,{onConflict:'user_id,event_id',ignoreDuplicates:true});if(error)throw error;}
      return Response.json({ok:true});
    }
    if(body.action==='toggle'){
      const {data:existing,error:readError}=await db.from('favorite_events').select('event_id').eq('user_id',user.id).eq('event_id',body.event_id).maybeSingle();if(readError)throw readError;
      if(existing){const {error}=await db.from('favorite_events').delete().eq('user_id',user.id).eq('event_id',body.event_id);if(error)throw error;return Response.json({saved:false});}
      const {error}=await db.from('favorite_events').insert({user_id:user.id,event_id:body.event_id,notify:body.notify??true});if(error)throw error;return Response.json({saved:true});
    }
    const {error}=await db.from('favorite_events').update({notify:body.notify}).eq('user_id',user.id).eq('event_id',body.event_id);if(error)throw error;
    if(!body.notify){const {error:reminderError}=await db.from('favorite_event_reminders').delete().eq('user_id',user.id).eq('event_id',body.event_id).is('sent_at',null);if(reminderError)throw reminderError;}
    return Response.json({ok:true});
  }catch(e){return failure(e);}
}
