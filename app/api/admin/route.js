import { z } from 'zod';
import { authenticatedClient } from '@/lib/supabase/server';
import { checkOrigin, failure } from '@/lib/api';
const url = z.union([z.literal(''),z.string().url().refine(s => s.startsWith('https://'), 'HTTPS havola kerak.')]).optional();
const eventSchema = z.object({ title:z.string().min(1).max(180),description:z.string().max(12000),venue_id:z.string().uuid(),category:z.enum(['concert','theatre','sport','comedy','festival']),starts_at:z.string().datetime({ offset:true }),poster_url:url,status:z.enum(['draft','published','cancelled']),featured:z.boolean(),is_demo:z.boolean() });
const rowSchema = z.object({ label:z.string().min(1).max(12),count:z.number().int().min(1).max(100),price:z.number().int().min(0).max(999999999999),category:z.string().min(1).max(50) });
const venueSchema = z.object({ name:z.string().min(1).max(150),address:z.string().min(1).max(500),city:z.string().min(1).max(100),type:z.enum(['hall','arena','stadium','theatre']),image_url:url,layout:z.array(rowSchema).min(1).max(100).refine(rows => new Set(rows.map(r=>r.label)).size === rows.length,'Qator nomlari takrorlanmasin.') });
export async function POST(request) {
  try {
    checkOrigin(request);
    const { db } = await authenticatedClient(true);
    const body = z.object({ action:z.enum(['save_event','save_venue','delete_event','delete_venue','confirm','cancel','verify','save_seat']), id:z.string().uuid().optional(), data:z.unknown().optional() }).parse(await request.json());
    let result;
    if (body.action === 'save_event') {
      const values=eventSchema.parse(body.data);
      if (body.id) {
        // Venue changes after map creation would make the seating map misleading.
        const { data:existing,error }=await db.from('events').select('venue_id').eq('id',body.id).single();
        if(error) throw error;
        if(existing.venue_id!==values.venue_id) throw new Error('Mavjud tadbir manzilini o‘zgartirmang. Yangi tadbir yarating.');
        result=await db.from('events').update(values).eq('id',body.id).select('id').single();
      } else result=await db.rpc('create_event_with_seats',{ p_event:values });
    } else if(body.action==='save_venue') {
      const values=venueSchema.parse(body.data);
      result=body.id ? await db.from('venues').update(values).eq('id',body.id).select('id').single() : await db.from('venues').insert(values).select('id').single();
    } else if(body.action==='save_seat') {
      const values=z.object({ price:z.number().int().min(0).max(999999999999),category:z.string().min(1).max(50) }).parse(body.data);
      if(!body.id) throw new Error('Joy ID kerak.');
      result=await db.from('seats').update(values).eq('id',body.id).select('id').single();
    } else if(body.action==='verify') {
      const values=z.object({ token:z.string().regex(/^[a-f0-9]{64}$/,'QR token 64 belgili bo‘lishi kerak.'),mark_used:z.boolean() }).parse(body.data);
      result=await db.rpc('verify_ticket',{p_token:values.token,p_mark_used:values.mark_used});
    } else {
      if(!body.id) throw new Error('ID kerak.');
      if(body.action==='delete_event'||body.action==='delete_venue') result=await db.from(body.action==='delete_event'?'events':'venues').delete().eq('id',body.id).select('id').single();
      else result=await db.rpc(body.action==='confirm'?'confirm_cash_payment':'cancel_booking',{p_booking_id:body.id});
    }
    if(result.error) throw result.error;
    if(result.data?.error) throw new Error(result.data.error);
    return Response.json({ data:result.data });
  } catch(e) { return failure(e); }
}
