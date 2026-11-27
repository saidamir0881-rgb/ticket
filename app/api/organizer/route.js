import {authenticatedClient} from '@/lib/supabase/server';
import {failure} from '@/lib/api';

export async function GET(){
 try{
  const {db,user}=await authenticatedClient();
  const {data:members,error}=await db.from('organization_members').select('organization_id,role,organization:organizations(id,name)').eq('user_id',user.id);if(error)throw error;
  if(!members?.length)throw Object.assign(new Error('Tashkilotchi kabineti uchun administrator tashkilotingizga ruxsat berishi kerak.'),{status:403});
  const orgIds=members.map(m=>m.organization_id);
  const {data:events,error:eventError}=await db.from('events').select('id,title,starts_at,status,organization_id,bookings(id,status,total,items:booking_seats(id))').in('organization_id',orgIds).order('starts_at',{ascending:false}).limit(100);if(eventError)throw eventError;
  const summary=(events||[]).map(event=>{const paid=(event.bookings||[]).filter(b=>b.status==='paid');return {...event,bookings:undefined,paid_tickets:paid.reduce((sum,b)=>sum+(b.items?.length||0),0),revenue:paid.reduce((sum,b)=>sum+Number(b.total||0),0),orders:(event.bookings||[]).length};});
  return Response.json({organizations:members.map(m=>({id:m.organization?.id,name:m.organization?.name,role:m.role})),events:summary},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}
}
