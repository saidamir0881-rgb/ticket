import {z} from 'zod';
import {checkOrigin,failure} from '@/lib/api';
import {getTelegramOtpStore} from '@/lib/telegram-otp';
import {findVerifiedPhoneUser,phoneLoginEmail} from '@/lib/supabase/auth-users';
import {serviceClient} from '@/lib/supabase/service';
import {encryptTelegramAuthLink} from '@/lib/telegram-auth-link';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request){
 let store,sessionId,completed=false;
 try{
  checkOrigin(request);
  const body=z.object({sessionId:z.string().uuid(),phone:z.string().min(8).max(30)}).parse(await request.json());
  store=getTelegramOtpStore();sessionId=body.sessionId;
  const claim=await store.claimLoginCompletion(sessionId,body.phone),admin=serviceClient();
  if(!Number.isSafeInteger(claim.telegramUserId)||!Number.isSafeInteger(claim.chatId))throw Object.assign(new Error('Telegram kontaktni qayta ulash uchun yangi kod so‘rang.'),{status:409});
  const userId=await findVerifiedPhoneUser(admin,claim.phone);
  if(!userId)throw Object.assign(new Error('Tasdiqlangan telefon akkaunti topilmadi.'),{status:404});
  const {data:userData,error:userError}=await admin.auth.admin.getUserById(userId);
  if(userError||!userData?.user)throw Object.assign(new Error('Akkauntni tekshirib bo‘lmadi.'),{status:503});
  const appMetadata={...(userData.user.app_metadata||{}),telegram_otp_link:encryptTelegramAuthLink(claim.telegramUserId,claim.chatId)};
  const {error:linkError}=await admin.auth.admin.updateUserById(userId,{app_metadata:appMetadata});
  if(linkError)throw Object.assign(new Error('Telegram akkauntini xavfsiz bog‘lab bo‘lmadi.'),{status:503});
  await store.finishRegistration(sessionId);completed=true;
  return Response.json({linked:true,loginEmail:userData.user.email||phoneLoginEmail(claim.phone)},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(store&&sessionId&&!completed)await store.releaseRegistration(sessionId);
  return failure(error);
 }
}
