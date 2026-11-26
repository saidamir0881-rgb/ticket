import {z} from 'zod';
import {checkOrigin,failure} from '@/lib/api';
import {getTelegramOtpStore,sendTelegramOtpCode} from '@/lib/telegram-otp';
import {normalizeUzPhone} from '@/lib/phone';
import {serviceClient} from '@/lib/supabase/service';
import {findVerifiedPhoneUser} from '@/lib/supabase/auth-users';
import {decryptTelegramAuthLink} from '@/lib/telegram-auth-link';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request){
 try{
  checkOrigin(request);
  const {phone:rawPhone}=z.object({phone:z.string().min(8).max(30)}).parse(await request.json());
  const phone=normalizeUzPhone(rawPhone);if(!phone)throw Object.assign(new Error('Telefon raqamni +998 formatida kiriting.'),{status:400});
  const admin=serviceClient(),userId=await findVerifiedPhoneUser(admin,phone);
  if(!userId)throw Object.assign(new Error('Bu telefon raqam bilan akkaunt topilmadi.'),{status:404});
  const {data:userData,error:userError}=await admin.auth.admin.getUserById(userId);
  if(userError||!userData?.user)throw Object.assign(new Error('Akkauntni tekshirib bo‘lmadi.'),{status:503});
  const token=process.env.TELEGRAM_OTP_BOT_TOKEN,username=String(process.env.TELEGRAM_OTP_BOT_USERNAME||'').replace(/^@/,''),secret=process.env.TELEGRAM_OTP_WEBHOOK_SECRET;
  if(!token||!/^[A-Za-z0-9_]{5,32}$/.test(username)||String(secret||'').length<32)throw Object.assign(new Error('Telegram OTP bot sozlamalari to‘liq emas.'),{status:503});
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')||'unknown',store=getTelegramOtpStore(),session=await store.startSession({phone,ip});
  const link=decryptTelegramAuthLink(userData.user.app_metadata?.telegram_otp_link);
  if(!link){
   const telegramUrl=new URL(`https://t.me/${username}`);telegramUrl.searchParams.set('start',session.startToken);
   return Response.json({sessionId:session.sessionId,status:'waiting_contact',needsLink:true,telegramUrl:telegramUrl.href,expiresAt:session.expiresAt},{status:201,headers:{'Cache-Control':'no-store'}});
  }
  const bound=await store.bindStartToken(session.startToken,link.telegramUserId,link.chatId);
  const issued=bound&&await store.acceptContact(link.telegramUserId,{phone_number:phone,user_id:link.telegramUserId},session.sessionId);
  if(!issued?.ok)throw Object.assign(new Error('Telegram tasdiqlash sessiyasini yaratib bo‘lmadi.'),{status:503});
  try{await sendTelegramOtpCode(token,link.chatId,issued.otp);}
  catch(error){await store.finishRegistration(session.sessionId);throw error;}
  return Response.json({sessionId:session.sessionId,status:'otp_sent',expiresAt:issued.expiresAt},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}
}
