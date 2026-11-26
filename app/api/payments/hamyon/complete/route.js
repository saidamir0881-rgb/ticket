import {hamyonAdmin,hamyonCredentials,validHamyonSignature} from '@/lib/hamyon';

export async function POST(request){
  try{
    const form=await request.formData();
    const payload=Object.fromEntries(form.entries());
    const {shopId,shopKey}=hamyonCredentials();
    if(String(payload.shop_id)!==shopId||!validHamyonSignature(payload,shopKey))return Response.json({error:'Invalid signature'},{status:401});
    if(!['paid','cancel'].includes(String(payload.status)))return Response.json({ok:true});
    const db=hamyonAdmin();
    const {error}=await db.rpc('complete_hamyon_payment',{p_payment_id:String(payload.payment_id),p_amount:Number(payload.amount),p_status:String(payload.status)});
    if(error)throw error;
    return Response.json({ok:true});
  }catch(e){return Response.json({error:'Callback processing failed'},{status:500});}
}
