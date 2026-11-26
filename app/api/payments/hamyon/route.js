import {randomInt} from 'node:crypto';
import {z} from 'zod';
import {authenticatedClient} from '@/lib/supabase/server';
import {checkOrigin,failure} from '@/lib/api';
import {hamyonAdmin,hamyonCredentials} from '@/lib/hamyon';

export async function POST(request){
  try{
    checkOrigin(request);
    const {db,user}=await authenticatedClient();
    const {booking_id}=z.object({booking_id:z.string().uuid()}).parse(await request.json());
    const {data:booking,error}=await db.from('bookings').select('id,reference,total,status,payment_method,expires_at,payments(status,hamyon_payment_id)').eq('id',booking_id).eq('user_id',user.id).single();
    if(error||!booking)throw new Error('Buyurtma topilmadi.');
    if(booking.payment_method!=='card'||booking.status!=='pending'||new Date(booking.expires_at)<=new Date())throw new Error('Buyurtma to‘lov uchun yaroqsiz yoki muddati tugagan.');
    if(booking.payments?.hamyon_payment_id)throw new Error('Bu buyurtma uchun to‘lov allaqachon yaratilgan.');
    const {shopId,shopKey}=hamyonCredentials();
    const admin=hamyonAdmin();
    const {data:active,error:activeError}=await admin.from('payments').select('hamyon_amount').eq('status','pending').not('hamyon_payment_id','is',null);
    if(activeError)throw activeError;
    const occupied=new Set((active||[]).map(p=>Number(p.hamyon_amount)));
    let result,chargedAmount;
    // Always add a small unique suffix, even for the first open payment.
    // Randomize the first choice; on collision, walk the remaining 1–99 range.
    const firstOffset=randomInt(1,100);
    for(let attempt=0;attempt<99;attempt++){
      const offset=((firstOffset-1+attempt)%99)+1;
      const amount=Number(booking.total)+offset;
      if(occupied.has(amount))continue;
      const form=new URLSearchParams({shop_id:shopId,shop_key:shopKey,amount:String(amount),order_id:booking.id});
      const response=await fetch('https://hamyon-api.uz/payment/create',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(12000),cache:'no-store'});
      const body=await response.json();
      if(response.ok&&body.payment_id&&body.card){result=body;chargedAmount=amount;break;}
      const message=String(body.error||'');
      if(/summada ochiq|bir xil summa|same amount|already exists/i.test(message))continue;
      throw new Error(message||'Hamyon API to‘lov yaratolmadi.');
    }
    if(!result)throw new Error('Shu narxda boshqa ochiq to‘lovlar bor. Keyinroq qayta urinib ko‘ring.');
    const {error:saveError}=await admin.from('payments').update({method:'hamyon',hamyon_payment_id:String(result.payment_id),hamyon_amount:chargedAmount,hamyon_card:String(result.card)}).eq('booking_id',booking.id).eq('status','pending').is('hamyon_payment_id',null);
    if(saveError)throw saveError;
    return Response.json({payment_id:String(result.payment_id),amount:chargedAmount,card:String(result.card),expires_in:Number(result.expires_in)||300});
  }catch(e){return failure(e);}
}
