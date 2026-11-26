import {hamyonCredentials,validHamyonSignature} from '@/lib/hamyon';

export async function POST(request){
  try{
    const form=await request.formData();
    const payload=Object.fromEntries(form.entries());
    const {shopId,shopKey}=hamyonCredentials();
    if(String(payload.shop_id)!==shopId||!validHamyonSignature(payload,shopKey))return Response.json({error:'Invalid signature'},{status:401});
    return Response.json({ok:true});
  }catch{return Response.json({error:'Callback processing failed'},{status:500});}
}
