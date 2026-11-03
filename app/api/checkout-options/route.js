import {serverClient} from '@/lib/supabase/server';
export const dynamic='force-dynamic';
export async function GET() {
  const db=await serverClient();
  const [points,settings]=await Promise.all([
    db.from('cash_points').select('*').order('name'),
    db.from('payment_settings').select('recipient_name,recipient_card,bank_name,instructions,enabled').eq('id',1).eq('enabled',true).maybeSingle(),
  ]);
  if(points.error||settings.error)return Response.json({error:'To‘lov sozlamalari hali tayyor emas. Administrator yangi migratsiyalarni o‘rnatishi kerak.'},{status:503});
  return Response.json({points:points.data||[],settings:settings.data},{headers:{'Cache-Control':'private, no-store'}});
}
