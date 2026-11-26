import {failure} from '@/lib/api';
import {getTelegramOtpStore,handleTelegramOtpUpdate,verifyTelegramWebhookSecret} from '@/lib/telegram-otp';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request){
 try{
  const expected=process.env.TELEGRAM_OTP_WEBHOOK_SECRET;
  const supplied=request.headers.get('x-telegram-bot-api-secret-token');
  if(!verifyTelegramWebhookSecret(expected,supplied))return Response.json({error:'Unauthorized'},{status:401});
  const size=Number(request.headers.get('content-length')||0);
  if(size>1024*1024)return Response.json({error:'Payload too large'},{status:413});
  const token=process.env.TELEGRAM_OTP_BOT_TOKEN;
  if(!token)throw Object.assign(new Error('TELEGRAM_OTP_BOT_TOKEN sozlanmagan.'),{status:503});
  const update=await request.json();
  await handleTelegramOtpUpdate(getTelegramOtpStore(),update,{token});
  return Response.json({ok:true});
 }catch(error){return failure(error);}
}
