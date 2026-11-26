import {z} from 'zod';
import {checkOrigin,failure} from '@/lib/api';
import {getTelegramOtpStore} from '@/lib/telegram-otp';
import {serviceClient} from '@/lib/supabase/service';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request){
 let store,sessionId,userId;
 try{
  checkOrigin(request);
  const body=z.object({
   sessionId:z.string().uuid(),
   phone:z.string().min(8).max(30),
   firstName:z.string().trim().min(1,'Ismni kiriting.').max(50),
   lastName:z.string().trim().min(1,'Familiyani kiriting.').max(50),
   password:z.string().min(8,'Parol kamida 8 belgidan iborat bo‘lsin.').max(72,'Parol 72 belgidan oshmasin.'),
  }).parse(await request.json());
  const fullName=`${body.firstName} ${body.lastName}`.trim();
  if(fullName.length>100)throw Object.assign(new Error('Ism va familiya jami 100 belgidan oshmasin.'),{status:400});
  store=getTelegramOtpStore();sessionId=body.sessionId;
  const claim=await store.claimRegistration(sessionId,body.phone);
  const admin=serviceClient();
  const {data,error}=await admin.auth.admin.createUser({phone:claim.phone,password:body.password,phone_confirm:true,user_metadata:{full_name:fullName}});
  if(error){
   const authError=`${error.code||''} ${error.message||''} ${error.details||''}`.toLowerCase();
   if(error.code==='23505'||/phone_exists|user_already_exists|already registered|already exists|phone.{0,30}already|already.{0,30}phone/.test(authError))
    throw Object.assign(new Error('Bu telefon raqam orqali oldin akkaunt yaratilgan.'),{status:409});
   throw Object.assign(new Error('Akkaunt yaratilmadi. Ma’lumotlarni tekshirib, qayta urinib ko‘ring.'),{status:409});
  }
  if(!data?.user)throw Object.assign(new Error('Akkaunt yaratilmadi. Qayta urinib ko‘ring.'),{status:409});
  userId=data.user.id;
  const {error:profileError}=await admin.from('profiles').upsert({id:userId,full_name:fullName,phone:claim.phone},{onConflict:'id'});
  if(profileError){
   await admin.auth.admin.deleteUser(userId).catch(()=>{});userId=null;
   throw new Error('Profilni saqlab bo‘lmadi. Qayta urinib ko‘ring.');
  }
  await store.finishRegistration(sessionId);
  return Response.json({created:true,phone:claim.phone},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){
  if(store&&sessionId&&!userId)await store.releaseRegistration(sessionId);
  return failure(error);
 }
}
