import {randomBytes} from 'node:crypto';
import {authenticatedClient} from '@/lib/supabase/server';
import {checkOrigin,failure} from '@/lib/api';

export async function GET(){
 try{
  const {db,user}=await authenticatedClient();let {data:referral,error}=await db.from('referrals').select('code').eq('user_id',user.id).maybeSingle();if(error)throw error;
  if(!referral){const code=randomBytes(5).toString('hex').toUpperCase();const created=await db.from('referrals').insert({user_id:user.id,code}).select('code').single();if(created.error&&created.error.code!=='23505')throw created.error;referral=created.data;if(!referral){const retry=await db.from('referrals').select('code').eq('user_id',user.id).single();if(retry.error)throw retry.error;referral=retry.data;}}
  const {count,error:countError}=await db.from('referrals').select('user_id',{count:'exact',head:true}).eq('referred_by',user.id);if(countError)throw countError;
  return Response.json({code:referral.code,link:`${new URL('/register',process.env.NEXT_PUBLIC_SITE_URL||'https://ticket-pi-six.vercel.app').toString()}?ref=${referral.code}`,invited:count||0},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return failure(e);}
}
export async function POST(request){
 try{checkOrigin(request);const {db,user}=await authenticatedClient();const {referral_code}=await request.json();if(typeof referral_code!=='string')return Response.json({ok:true});
  const {data:source,error}=await db.from('referrals').select('user_id').eq('code',referral_code.toUpperCase()).maybeSingle();if(error)throw error;if(!source||source.user_id===user.id)return Response.json({ok:true});
  const {error:upsertError}=await db.from('referrals').upsert({user_id:user.id,code:randomBytes(5).toString('hex').toUpperCase(),referred_by:source.user_id},{onConflict:'user_id'});if(upsertError)throw upsertError;return Response.json({ok:true});
 }catch(e){return failure(e);}
}
