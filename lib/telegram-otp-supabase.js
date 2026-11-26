import {createHmac,randomBytes,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import {normalizeUzPhone} from './phone.js';
import {serviceClient} from './supabase/service.js';

const OTP_TTL=5*60_000,START_TTL=10*60_000,REGISTER_TTL=10*60_000;
const digest=(secret,purpose,value)=>createHmac('sha256',secret).update(`${purpose}:${value}`).digest('hex');
const equal=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y);};
const error=(message,status)=>Object.assign(new Error(message),{status});

export function createSupabaseTelegramOtpStore({secret,client=serviceClient(),now=Date.now,otpTtlMs=OTP_TTL,startTtlMs=START_TTL,registerTtlMs=REGISTER_TTL}={}){
 if(typeof secret!=='string'||secret.length<32)throw error('TELEGRAM_OTP_HASH_SECRET kamida 32 belgidan iborat bo‘lishi kerak.',503);
 async function rateLimit(purpose,value,limit){
  const key=digest(secret,`rate:${purpose}`,value),{data,error:dbError}=await client.rpc('consume_telegram_otp_rate_limit',{p_key:key,p_max:limit,p_window_seconds:900});
  if(dbError)throw error('OTP rate limit bazasi sozlanmagan. Supabase migration’ni qo‘llang.',503);
  const result=Array.isArray(data)?data[0]:data;
  if(!result?.allowed)throw error(`Ko‘p so‘rov yuborildi. ${Math.max(1,Number(result?.retry_after||1))} soniyadan keyin qayta urinib ko‘ring.`,429);
 }
 async function startSession({phone,ip}){
  const normalized=normalizeUzPhone(phone);if(!normalized)throw error('O‘zbekiston telefon raqamini +998 formatida kiriting.',400);
  await rateLimit('phone',normalized,3);await rateLimit('ip',String(ip||'unknown'),10);
  const id=randomUUID(),token=randomBytes(32).toString('base64url'),created=now(),expires=created+startTtlMs;
  const row={id,phone:normalized,status:'waiting_bot',created_at:new Date(created).toISOString(),start_expires_at:new Date(expires).toISOString(),start_token_hash:digest(secret,'start',token),telegram_user_id:null,chat_id:null,otp_hash:null,otp_expires_at:null,attempts:0,verified_expires_at:null};
  const {error:dbError}=await client.from('telegram_otp_sessions').insert(row);if(dbError)throw error('OTP sessiyasini saqlab bo‘lmadi. Supabase migration’ni tekshiring.',503);
  return {sessionId:id,startToken:token,expiresAt:expires};
 }
 async function bindStartToken(token,telegramUserId,chatId){
  if(typeof token!=='string'||token.length<30||!Number.isSafeInteger(telegramUserId)||!Number.isSafeInteger(chatId))return null;
  const tokenHash=digest(secret,'start',token),{data:found,error:readError}=await client.from('telegram_otp_sessions').select('*').eq('start_token_hash',tokenHash).maybeSingle();
  if(readError)throw error('OTP sessiyasini o‘qib bo‘lmadi.',503);if(!found||now()>Date.parse(found.start_expires_at))return null;
  if(found.status==='waiting_contact'&&String(found.telegram_user_id)===String(telegramUserId))return {sessionId:found.id,phone:found.phone,reused:true};
  if(found.status!=='waiting_bot')return null;
  const expires=now()+startTtlMs,{data,error:dbError}=await client.from('telegram_otp_sessions').update({status:'waiting_contact',telegram_user_id:telegramUserId,chat_id:chatId,start_expires_at:new Date(expires).toISOString()}).eq('id',found.id).eq('status','waiting_bot').select('id,phone').maybeSingle();
  if(dbError)throw error('Telegram sessiyasini bog‘lab bo‘lmadi.',503);return data?{sessionId:data.id,phone:data.phone}:null;
 }
 async function acceptContact(telegramUserId,contact){
  const {data:s,error:dbError}=await client.from('telegram_otp_sessions').select('*').eq('telegram_user_id',telegramUserId).in('status',['waiting_contact','otp_sent']).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(dbError)throw error('Telegram sessiyasini o‘qib bo‘lmadi.',503);if(!s)return {ok:false,reason:'no_session'};
  if(s.status==='otp_sent')return {ok:false,reason:'already_sent'};
  if(!Number.isSafeInteger(contact?.user_id)||contact.user_id!==telegramUserId)return {ok:false,reason:'not_own_contact'};
  if(normalizeUzPhone(contact.phone_number)!==s.phone)return {ok:false,reason:'phone_mismatch'};
  const otp=String(randomInt(0,1_000_000)).padStart(6,'0'),expires=now()+otpTtlMs;
  const {data,error:updateError}=await client.from('telegram_otp_sessions').update({status:'otp_sent',otp_hash:digest(secret,`otp:${s.id}`,otp),otp_expires_at:new Date(expires).toISOString(),attempts:0}).eq('id',s.id).eq('status','waiting_contact').select('id').maybeSingle();
  if(updateError)throw error('OTP kodini saqlab bo‘lmadi.',503);if(!data)return {ok:false,reason:'already_sent'};
  return {ok:true,sessionId:s.id,otp,expiresAt:expires};
 }
 async function getStatus(id){
  const {data:s,error:dbError}=await client.from('telegram_otp_sessions').select('*').eq('id',id).maybeSingle();
  if(dbError)throw error('OTP holatini o‘qib bo‘lmadi.',503);if(!s)return null;
  const time=now(),otpExpires=Date.parse(s.otp_expires_at),verifiedExpires=Date.parse(s.verified_expires_at),startExpires=Date.parse(s.start_expires_at);
  if(s.status==='otp_sent'&&time>otpExpires)return {sessionId:id,status:'expired',expiresAt:otpExpires};
  const expiresAt=['verified','registering'].includes(s.status)?verifiedExpires:s.status==='otp_sent'?otpExpires:startExpires;
  return {sessionId:id,status:s.status,expiresAt};
 }
 async function verifyOtp(id,code){
  const {data:s,error:dbError}=await client.from('telegram_otp_sessions').select('*').eq('id',id).maybeSingle();
  if(dbError)throw error('OTP holatini o‘qib bo‘lmadi.',503);if(!s)throw error('Tasdiqlash muddati tugagan. Yangi kod so‘rang.',410);
  if(s.status==='blocked')throw error('Urinishlar limiti tugadi. Yangi tasdiqlashni boshlang.',429);
  if(s.status==='verified')return {status:'verified'};
  if(s.status!=='otp_sent')throw error('Botdan kod kelishini kuting.',409);
  const expires=Date.parse(s.otp_expires_at);if(now()>expires){await client.from('telegram_otp_sessions').update({status:'expired',otp_hash:null}).eq('id',id).eq('status','otp_sent');throw error('Kod muddati tugadi. Yangi kod so‘rang.',410);}
  const valid=/^\d{6}$/.test(String(code||''))&&equal(s.otp_hash,digest(secret,`otp:${id}`,String(code)));
  const attempts=Number(s.attempts)+(valid?0:1),status=valid?'verified':attempts>=5?'blocked':'otp_sent';
  const patch={status,attempts,otp_hash:valid||status==='blocked'?null:s.otp_hash,...(valid?{verified_expires_at:new Date(now()+registerTtlMs).toISOString()}:{}),...(status==='blocked'?{otp_expires_at:new Date(now()).toISOString()}: {})};
  const {data,error:updateError}=await client.from('telegram_otp_sessions').update(patch).eq('id',id).eq('status','otp_sent').eq('attempts',s.attempts).select('id').maybeSingle();
  if(updateError)throw error('OTP holatini yangilab bo‘lmadi.',503);if(!data)throw error('Kod tekshirilayotganda sessiya yangilandi. Qayta urinib ko‘ring.',409);
  if(!valid)throw error(status==='blocked'?'5 marta noto‘g‘ri kod kiritildi. Tasdiqlash bloklandi.':`Kod noto‘g‘ri. Yana ${5-attempts} urinish qoldi.`,status==='blocked'?429:400);
  return {status:'verified'};
 }
 async function claimRegistration(id,phone){
  const normalized=normalizeUzPhone(phone);const {data:s,error:dbError}=await client.from('telegram_otp_sessions').select('phone,status,verified_expires_at').eq('id',id).maybeSingle();
  if(dbError)throw error('Tasdiqlash sessiyasini o‘qib bo‘lmadi.',503);
  if(!s||s.status!=='verified'||now()>Date.parse(s.verified_expires_at))throw error('Avval telefon raqamini Telegram orqali tasdiqlang.',403);
  if(normalized!==s.phone)throw error('Telefon raqami tasdiqlangan raqam bilan mos emas.',400);
  const {data,error:updateError}=await client.from('telegram_otp_sessions').update({status:'registering'}).eq('id',id).eq('status','verified').select('id').maybeSingle();
  if(updateError)throw error('Akkaunt yaratish sessiyasini yangilab bo‘lmadi.',503);if(!data)throw error('Akkaunt yaratish jarayoni davom etmoqda.',409);
  return {sessionId:id,phone:s.phone};
 }
 async function claimPasswordReset(id,phone){
  const normalized=normalizeUzPhone(phone);const {data:s,error:dbError}=await client.from('telegram_otp_sessions').select('phone,status,verified_expires_at').eq('id',id).maybeSingle();
  if(dbError)throw error('Tasdiqlash sessiyasini o‘qib bo‘lmadi.',503);
  if(!s||s.status!=='verified'||now()>Date.parse(s.verified_expires_at))throw error('Avval telefon raqamini Telegram orqali tasdiqlang.',403);
  if(normalized!==s.phone)throw error('Telefon raqami tasdiqlangan raqam bilan mos emas.',400);
  const {data,error:updateError}=await client.from('telegram_otp_sessions').update({status:'registering'}).eq('id',id).eq('status','verified').select('id').maybeSingle();
  if(updateError)throw error('Parolni tiklash sessiyasini yangilab bo‘lmadi.',503);if(!data)throw error('Parolni tiklash jarayoni davom etmoqda.',409);
  return {sessionId:id,phone:s.phone};
 }
 async function finishRegistration(id){const {error:e}=await client.from('telegram_otp_sessions').delete().eq('id',id);if(e)throw error('Tasdiqlangan sessiyani yakunlab bo‘lmadi.',503);}
 async function releaseRegistration(id){await client.from('telegram_otp_sessions').update({status:'verified'}).eq('id',id).eq('status','registering');}
 async function prune(){const cutoff=new Date(now()-2*60*60_000).toISOString();await client.from('telegram_otp_sessions').delete().lt('created_at',cutoff);}
 return {startSession,bindStartToken,acceptContact,getStatus,verifyOtp,claimRegistration,claimPasswordReset,finishRegistration,releaseRegistration,prune};
}

export function getSupabaseTelegramOtpStore(){
 if(!globalThis.__uzticketSupabaseTelegramOtpStore)globalThis.__uzticketSupabaseTelegramOtpStore=createSupabaseTelegramOtpStore({secret:process.env.TELEGRAM_OTP_HASH_SECRET});
 return globalThis.__uzticketSupabaseTelegramOtpStore;
}
