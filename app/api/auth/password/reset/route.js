import {z} from 'zod';
import {checkOrigin,failure} from '@/lib/api';
import {getTelegramOtpStore} from '@/lib/telegram-otp';
import {serviceClient} from '@/lib/supabase/service';

export const runtime='nodejs';
export const dynamic='force-dynamic';

async function findVerifiedPhoneUser(admin,phone){
 for(let page=1;page<=100;page++){
  const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});
  if(error)throw Object.assign(new Error('Akkauntni tekshirib bo‘lmadi. Qayta urinib ko‘ring.'),{status:503});
  const user=data.users.find(item=>item.phone===phone&&item.phone_confirmed_at);
  if(user)return user.id;
  if(data.users.length<1000)return null;
 }
 throw Object.assign(new Error('Akkauntlar ro‘yxati juda katta. Yordam xizmatiga murojaat qiling.'),{status:503});
}

export async function POST(request){
 let store,sessionId,completed=false;
 try{
  checkOrigin(request);
  const body=z.object({sessionId:z.string().uuid(),phone:z.string().min(8).max(30),password:z.string().min(8,'Parol kamida 8 belgidan iborat bo‘lsin.').max(72,'Parol 72 belgidan oshmasin.')}).parse(await request.json());
  sessionId=body.sessionId;store=getTelegramOtpStore();
  const claim=await store.claimPasswordReset(sessionId,body.phone),admin=serviceClient();
  const userId=await findVerifiedPhoneUser(admin,claim.phone);
  if(!userId)throw Object.assign(new Error('Bu raqam bilan ro‘yxatdan o‘tgan akkaunt topilmadi.'),{status:404});
  const {error:updateError}=await admin.auth.admin.updateUserById(userId,{password:body.password});
  if(updateError)throw Object.assign(new Error('Parolni yangilab bo‘lmadi. Qayta urinib ko‘ring.'),{status:503});
  await store.finishRegistration(sessionId);completed=true;
  return Response.json({updated:true},{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(store&&sessionId&&!completed)await store.releaseRegistration(sessionId);
  return failure(error);
 }
}
