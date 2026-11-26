import {z} from 'zod';
import {checkOrigin,failure} from '@/lib/api';
import {getTelegramOtpStore,sendTelegramOtpCode} from '@/lib/telegram-otp';
import {normalizeUzPhone} from '@/lib/phone';
import {findVerifiedPhoneUser} from '@/lib/supabase/auth-users';
import {publicAuthClient,serviceClient} from '@/lib/supabase/service';
import {decryptTelegramAuthLink} from '@/lib/telegram-auth-link';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request){
 try{
  checkOrigin(request);
  const body=z.object({phone:z.string().min(8).max(30),password:z.string().min(1).max(72)}).parse(await request.json());
  const phone=normalizeUzPhone(body.phone);if(!phone)throw Object.assign(new Error('Telefon raqamni +998 formatida kiriting.'),{status:400});
  const auth=publicAuthClient();
  let {data:authData,error:authError}=await auth.auth.signInWithPassword({phone,password:body.password});
  // Legacy accounts can have the same number stored in a non-canonical form.
  // Resolve that account and retry using the exact phone value Supabase stores.
  if(authError||!authData?.user){
   try{
    const admin=serviceClient(),userId=await findVerifiedPhoneUser(admin,phone);
    if(userId){
     const {data:userData}=await admin.auth.admin.getUserById(userId),storedPhone=userData?.user?.phone;
     if(storedPhone&&storedPhone!==phone){const retry=await auth.auth.signInWithPassword({phone:storedPhone,password:body.password});authData=retry.data;authError=retry.error;}
    }
   }catch{}
  }
  if(authError||!authData?.user)throw Object.assign(new Error('Telefon raqam yoki parol noto‘g‘ri.'),{status:401});
  const link=decryptTelegramAuthLink(authData.user.app_metadata?.telegram_otp_link);
  const token=process.env.TELEGRAM_OTP_BOT_TOKEN,username=String(process.env.TELEGRAM_OTP_BOT_USERNAME||'').replace(/^@/,''),secret=process.env.TELEGRAM_OTP_WEBHOOK_SECRET;
  if(!token||!/^[A-Za-z0-9_]{5,32}$/.test(username)||String(secret||'').length<32)throw Object.assign(new Error('Telegram OTP bot sozlamalari to‘liq emas.'),{status:503});
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')||'unknown',store=getTelegramOtpStore();
  const session=await store.startSession({phone,ip});
  if(link){
   const userId=link.telegramUserId,chatId=link.chatId;
   const bound=await store.bindStartToken(session.startToken,userId,chatId);
   const issued=bound&&await store.acceptContact(userId,{phone_number:phone,user_id:userId},session.sessionId);
   if(!issued?.ok)throw Object.assign(new Error('Telegram tasdiqlash sessiyasini yaratib bo‘lmadi.'),{status:503});
   await sendTelegramOtpCode(token,chatId,issued.otp);
   return Response.json({sessionId:session.sessionId,status:'otp_sent',expiresAt:issued.expiresAt},{status:201,headers:{'Cache-Control':'no-store'}});
  }
  const telegramUrl=new URL(`https://t.me/${username}`);telegramUrl.searchParams.set('start',session.startToken);
  return Response.json({sessionId:session.sessionId,status:'waiting_contact',telegramUrl:telegramUrl.href,expiresAt:session.expiresAt},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){return failure(error);}
}
