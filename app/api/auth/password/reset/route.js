import {z} from 'zod';
import {checkOrigin,failure} from '@/lib/api';
import {getTelegramOtpStore} from '@/lib/telegram-otp';
import {serviceClient} from '@/lib/supabase/service';
import {findVerifiedPhoneUser,phoneLoginEmail} from '@/lib/supabase/auth-users';
import {encryptTelegramAuthLink} from '@/lib/telegram-auth-link';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request){
 let store,sessionId,completed=false;
 try{
  checkOrigin(request);
  const body=z.object({sessionId:z.string().uuid(),phone:z.string().min(8).max(30),password:z.string().min(8,'Parol kamida 8 belgidan iborat bo‘lsin.').max(72,'Parol 72 belgidan oshmasin.')}).parse(await request.json());
  sessionId=body.sessionId;store=getTelegramOtpStore();
  const claim=await store.claimPasswordReset(sessionId,body.phone),admin=serviceClient();
  const userId=await findVerifiedPhoneUser(admin,claim.phone);
  if(!userId)throw Object.assign(new Error('Bu raqam bilan ro‘yxatdan o‘tgan akkaunt topilmadi.'),{status:404});
  const {data:userData,error:userError}=await admin.auth.admin.getUserById(userId);
  if(userError||!userData?.user)throw Object.assign(new Error('Akkauntni tekshirib bo‘lmadi.'),{status:503});
  const appMetadata={...(userData.user.app_metadata||{}),telegram_otp_link:encryptTelegramAuthLink(claim.telegramUserId,claim.chatId)};
  const {error:linkError}=await admin.auth.admin.updateUserById(userId,{app_metadata:appMetadata});
  if(linkError)throw Object.assign(new Error('Telegram akkauntini xavfsiz bog‘lab bo‘lmadi.'),{status:503});
  const update={password:body.password};
  if(!userData.user.email){update.email=phoneLoginEmail(claim.phone);update.email_confirm=true;}
  const {error:updateError}=await admin.auth.admin.updateUserById(userId,update);
  if(updateError)throw Object.assign(new Error('Parolni yangilab bo‘lmadi. Qayta urinib ko‘ring.'),{status:503});
  await store.finishRegistration(sessionId);completed=true;
  return Response.json({updated:true},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(store&&sessionId&&!completed)await store.releaseRegistration(sessionId);
  return failure(error);
 }
}
