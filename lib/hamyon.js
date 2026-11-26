import {createHash,timingSafeEqual} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

export function hamyonCredentials(){
  const shopId=process.env.HAMYON_SHOP_ID,shopKey=process.env.HAMYON_SHOP_KEY;
  if(!shopId||!shopKey) throw new Error('Hamyon API server sozlamalari to‘ldirilmagan.');
  return {shopId,shopKey};
}

export function hamyonAdmin(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Supabase server kaliti sozlanmagan.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}

export function validHamyonSignature({shop_id,payment_id,amount,sign},shopKey){
  if(!shop_id||!payment_id||amount===undefined||!sign)return false;
  const expected=createHash('md5').update(`${shop_id}${payment_id}${amount}${shopKey}`).digest('hex');
  const a=Buffer.from(expected),b=Buffer.from(String(sign).toLowerCase());
  return a.length===b.length&&timingSafeEqual(a,b);
}
