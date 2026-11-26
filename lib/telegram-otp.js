import {createHmac,randomBytes,randomInt,randomUUID,timingSafeEqual} from 'node:crypto';
import {normalizeUzPhone} from './phone.js';
import {getSupabaseTelegramOtpStore} from './telegram-otp-supabase.js';
export {normalizeUzPhone} from './phone.js';

const OTP_TTL_MS=5*60*1000;
const START_TTL_MS=10*60*1000;
const REGISTER_TTL_MS=10*60*1000;
const RATE_WINDOW_MS=15*60*1000;

function safeEqual(a,b){
 const left=Buffer.from(String(a)),right=Buffer.from(String(b));
 return left.length===right.length&&timingSafeEqual(left,right);
}

function hash(secret,purpose,value){return createHmac('sha256',secret).update(`${purpose}:${value}`).digest('hex');}

export function createTelegramOtpStore({secret,now=Date.now,otpTtlMs=OTP_TTL_MS,startTtlMs=START_TTL_MS,registerTtlMs=REGISTER_TTL_MS,rateWindowMs=RATE_WINDOW_MS,maxPhoneStarts=3,maxIpStarts=10}={}){
 if(typeof secret!=='string'||secret.length<32)throw new Error('TELEGRAM_OTP_HASH_SECRET kamida 32 belgidan iborat bo‘lishi kerak.');
 const sessions=new Map(),startTokens=new Map(),spentStartTokens=new Map(),telegramSessions=new Map(),phoneStarts=new Map(),ipStarts=new Map();

 function prune(){
  const time=now();
  for(const [id,s] of sessions){
   const expires=s.status==='verified'||s.status==='registering'?s.verifiedExpiresAt:s.status==='otp_sent'?s.otpExpiresAt+60_000:s.startExpiresAt;
   if(time>expires){
    sessions.delete(id);
    if(s.startTokenHash)startTokens.delete(s.startTokenHash);
    for(const [key,value] of spentStartTokens)if(value.id===id)spentStartTokens.delete(key);
    if(s.telegramUserId&&telegramSessions.get(String(s.telegramUserId))===id)telegramSessions.delete(String(s.telegramUserId));
   }
  }
  for(const store of [phoneStarts,ipStarts])for(const [key,items] of store){const active=items.filter(t=>time-t<rateWindowMs);if(active.length)store.set(key,active);else store.delete(key);}
 }

 function consumeRate(store,key,limit){
  const time=now(),items=(store.get(key)||[]).filter(t=>time-t<rateWindowMs);
  if(items.length>=limit){store.set(key,items);const retry=Math.max(1,Math.ceil((rateWindowMs-(time-items[0]))/1000));throw Object.assign(new Error(`Ko‘p so‘rov yuborildi. ${retry} soniyadan keyin qayta urinib ko‘ring.`),{status:429});}
  items.push(time);store.set(key,items);
 }

 function startSession({phone,ip}){
  prune();
  const normalized=normalizeUzPhone(phone);
  if(!normalized)throw Object.assign(new Error('O‘zbekiston telefon raqamini +998 formatida kiriting.'),{status:400});
  if(sessions.size>=10000)throw Object.assign(new Error('Tasdiqlash xizmati band. Birozdan keyin qayta urinib ko‘ring.'),{status:503});
  consumeRate(phoneStarts,normalized,maxPhoneStarts);
  consumeRate(ipStarts,String(ip||'unknown'),maxIpStarts);
  const id=randomUUID(),token=randomBytes(32).toString('base64url'),tokenHash=hash(secret,'start',token),createdAt=now();
  sessions.set(id,{id,phone:normalized,status:'waiting_bot',createdAt,startExpiresAt:createdAt+startTtlMs,startTokenHash:tokenHash,telegramUserId:null,chatId:null,otpHash:null,otpExpiresAt:null,attempts:0,verifiedExpiresAt:null,registrationLocked:false});
  startTokens.set(tokenHash,id);
  return {sessionId:id,startToken:token,expiresAt:createdAt+startTtlMs};
 }

 function bindStartToken(token,telegramUserId,chatId){
  prune();
  if(typeof token!=='string'||token.length<30||!Number.isSafeInteger(telegramUserId)||!Number.isSafeInteger(chatId))return null;
  const tokenHash=hash(secret,'start',token),id=startTokens.get(tokenHash),s=id&&sessions.get(id);
  if(!s){const spent=spentStartTokens.get(tokenHash),existing=spent&&sessions.get(spent.id);if(existing?.status==='waiting_contact'&&spent.telegramUserId===telegramUserId)return {sessionId:existing.id,phone:existing.phone,reused:true};return null;}
  if(s.status!=='waiting_bot'||now()>s.startExpiresAt||!safeEqual(s.startTokenHash,tokenHash))return null;
  startTokens.delete(tokenHash);spentStartTokens.set(tokenHash,{id:s.id,telegramUserId});s.startTokenHash=null;s.status='waiting_contact';s.startExpiresAt=now()+startTtlMs;s.telegramUserId=telegramUserId;s.chatId=chatId;
  telegramSessions.set(String(telegramUserId),id);
  return {sessionId:id,phone:s.phone};
 }

 function acceptContact(telegramUserId,contact,sessionId=null){
  prune();
  const id=sessionId||telegramSessions.get(String(telegramUserId)),s=id&&sessions.get(id);
  if(s&&String(s.telegramUserId)!==String(telegramUserId))return {ok:false,reason:'not_own_contact'};
  if(!s)return {ok:false,reason:'no_session'};
  if(!Number.isSafeInteger(contact?.user_id)||contact.user_id!==telegramUserId)return {ok:false,reason:'not_own_contact'};
  if(normalizeUzPhone(contact.phone_number)!==s.phone)return {ok:false,reason:'phone_mismatch'};
  if(s.status==='otp_sent')return {ok:false,reason:'already_sent'};
  if(s.status!=='waiting_contact')return {ok:false,reason:'no_session'};
  const otp=String(randomInt(0,1000000)).padStart(6,'0');
  s.otpHash=hash(secret,`otp:${s.id}`,otp);s.otpExpiresAt=now()+otpTtlMs;s.attempts=0;s.status='otp_sent';
  return {ok:true,sessionId:s.id,otp,expiresAt:s.otpExpiresAt};
 }

 function getStatus(id){
  prune();const s=sessions.get(id);if(!s)return null;
  if(s.status==='otp_sent'&&now()>s.otpExpiresAt)return {sessionId:s.id,status:'expired',expiresAt:s.otpExpiresAt};
  return {sessionId:s.id,status:s.status,expiresAt:s.status==='otp_sent'?s.otpExpiresAt:s.status==='verified'||s.status==='registering'?s.verifiedExpiresAt:s.startExpiresAt};
 }

 function verifyOtp(id,code){
  prune();const s=sessions.get(id);
  if(!s)throw Object.assign(new Error('Tasdiqlash muddati tugagan. Yangi kod so‘rang.'),{status:410});
  if(s.status==='blocked')throw Object.assign(new Error('Urinishlar limiti tugadi. Yangi tasdiqlashni boshlang.'),{status:429});
  if(s.status==='verified')return {status:'verified'};
  if(s.status!=='otp_sent')throw Object.assign(new Error('Botdan kod kelishini kuting.'),{status:409});
  if(now()>s.otpExpiresAt){s.status='expired';s.otpHash=null;throw Object.assign(new Error('Kod muddati tugadi. Yangi kod so‘rang.'),{status:410});}
  if(!/^\d{6}$/.test(String(code||''))||!safeEqual(s.otpHash,hash(secret,`otp:${s.id}`,String(code)))){
   s.attempts++;
   if(s.attempts>=5){s.status='blocked';s.otpHash=null;throw Object.assign(new Error('5 marta noto‘g‘ri kod kiritildi. Tasdiqlash bloklandi.'),{status:429});}
   throw Object.assign(new Error(`Kod noto‘g‘ri. Yana ${5-s.attempts} urinish qoldi.`),{status:400});
  }
  s.status='verified';s.otpHash=null;s.verifiedExpiresAt=now()+registerTtlMs;s.verifiedAt=now();
  if(s.telegramUserId&&telegramSessions.get(String(s.telegramUserId))===id)telegramSessions.delete(String(s.telegramUserId));
  return {status:'verified'};
 }

 function claimRegistration(id,phone){
  prune();const s=sessions.get(id);
  if(!s||s.status!=='verified'||now()>s.verifiedExpiresAt)throw Object.assign(new Error('Avval telefon raqamini Telegram orqali tasdiqlang.'),{status:403});
  if(normalizeUzPhone(phone)!==s.phone)throw Object.assign(new Error('Telefon raqami tasdiqlangan raqam bilan mos emas.'),{status:400});
  if(s.registrationLocked)throw Object.assign(new Error('Akkaunt yaratish jarayoni davom etmoqda.'),{status:409});
  s.registrationLocked=true;s.status='registering';
  return {sessionId:s.id,phone:s.phone,telegramUserId:s.telegramUserId,chatId:s.chatId};
 }

 function claimLoginCompletion(id,phone){
  prune();const s=sessions.get(id);
  if(!s||s.status!=='verified'||now()>s.verifiedExpiresAt)throw Object.assign(new Error('Telegram kodi bilan tasdiqlang.'),{status:403});
  if(normalizeUzPhone(phone)!==s.phone)throw Object.assign(new Error('Telefon raqami tasdiqlangan raqam bilan mos emas.'),{status:400});
  if(s.registrationLocked)throw Object.assign(new Error('Kirish tasdiqlash jarayoni davom etmoqda.'),{status:409});
  s.registrationLocked=true;s.status='registering';
  return {sessionId:s.id,phone:s.phone,telegramUserId:s.telegramUserId,chatId:s.chatId};
 }

 function claimPasswordReset(id,phone){
  prune();const s=sessions.get(id);
  if(!s||s.status!=='verified'||now()>s.verifiedExpiresAt)throw Object.assign(new Error('Avval telefon raqamini Telegram orqali tasdiqlang.'),{status:403});
  if(normalizeUzPhone(phone)!==s.phone)throw Object.assign(new Error('Telefon raqami tasdiqlangan raqam bilan mos emas.'),{status:400});
  if(s.registrationLocked)throw Object.assign(new Error('Parolni tiklash jarayoni davom etmoqda.'),{status:409});
  s.registrationLocked=true;s.status='registering';
  return {sessionId:s.id,phone:s.phone,telegramUserId:s.telegramUserId,chatId:s.chatId};
 }

 function finishRegistration(id){const s=sessions.get(id);if(s){s.status='consumed';s.otpHash=null;s.startTokenHash=null;sessions.delete(id);}}
 function releaseRegistration(id){const s=sessions.get(id);if(s?.status==='registering'){s.status='verified';s.registrationLocked=false;}}
 return {startSession,bindStartToken,acceptContact,getStatus,verifyOtp,claimRegistration,claimLoginCompletion,claimPasswordReset,finishRegistration,releaseRegistration,prune};
}

export function getTelegramOtpStore(){
 if(process.env.VERCEL==='1'||process.env.TELEGRAM_OTP_STORAGE==='supabase')return getSupabaseTelegramOtpStore();
 if(!globalThis.__uzticketTelegramOtpStore){
  const secret=process.env.TELEGRAM_OTP_HASH_SECRET;
  try{globalThis.__uzticketTelegramOtpStore=createTelegramOtpStore({secret});}
  catch(error){throw Object.assign(error,{status:503});}
 }
 return globalThis.__uzticketTelegramOtpStore;
}

async function telegramRequest(token,method,payload,fetcher=fetch){
 let response;
 try{
  response=await fetcher(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
  const body=await response.json();
  if(response.ok&&body.ok)return body.result;
 }catch{}
 throw Object.assign(new Error(`Telegram ${method} so‘rovi bajarilmadi.`),{status:502});
}

export async function handleTelegramOtpUpdate(store,update,{token,fetcher=fetch}={}){
 const message=update?.message,from=message?.from,chat=message?.chat;
 if(!message||chat?.type!=='private'||!Number.isSafeInteger(from?.id)||from.is_bot)return {ignored:true};
 const send=(text,extra={})=>telegramRequest(token,'sendMessage',{chat_id:chat.id,text,...extra},fetcher);
 const start=String(message.text||'').trim().match(/^\/start(?:@\w+)?(?:\s+([A-Za-z0-9_-]{1,64}))?$/i);
 if(start){
  if(!start[1]||start[1]==='account'){
   const base=new URL(process.env.TELEGRAM_OTP_WEBHOOK_URL||'https://ticket-pi-six.vercel.app/api/telegram/otp-webhook').origin;
   await send('UZTicket’da ro‘yxatdan o‘tishni boshlash uchun tugmani bosing:',{reply_markup:{inline_keyboard:[[{text:'🎟 Ro‘yxatdan o‘tish',url:`${base}/register`}]]}});
   return {accepted:true,menu:true};
  }
  const bound=await store.bindStartToken(start[1],from.id,chat.id);
  if(!bound){await send('Havola eskirgan yoki ishlatib bo‘lingan. Saytga qaytib yangi tasdiqlash havolasini oling.');return {accepted:false};}
  await send('Telefon raqamingizni tasdiqlash uchun quyidagi tugmani bosing. Telegram kontakt so‘raydi:',{reply_markup:{keyboard:[[{text:'📱 Telefon raqamimni ulashish',request_contact:true}]],resize_keyboard:true,one_time_keyboard:true}});
  return {accepted:true};
 }
 if(message.contact){
  const result=await store.acceptContact(from.id,message.contact);
  if(!result.ok){
   const text=result.reason==='already_sent'?'Tasdiqlash kodi avval yuborildi. Saytga qaytib kodni kiriting.':result.reason==='phone_mismatch'?'Yuborilgan raqam saytdagi raqam bilan mos emas. Saytga kiritgan raqamingizga tegishli Telegram kontaktini yuboring.':result.reason==='not_own_contact'?'Boshqa odamning kontaktini qabul qila olmaymiz. O‘z raqamingizni “Telefon raqamimni ulashish” tugmasi orqali yuboring.':'Tasdiqlash sessiyasi topilmadi. Saytdan yangi havola olib, botga qayta kiring.';
   await send(text);return {accepted:false,reason:result.reason};
  }
  await send('Telefon raqamingiz tasdiqlandi.',{reply_markup:{remove_keyboard:true}});
  await send(`Kirish kodi: ${result.otp}\n\nKod 5 daqiqa amal qiladi. Uni hech kimga bermang. Nusxalash uchun quyidagi kodni bosing.`,{reply_markup:{inline_keyboard:[[{text:result.otp,copy_text:{text:result.otp}}]]}});
  return {accepted:true};
 }
 await send('Telefon raqamni tasdiqlashni saytdan boshlang va botdagi Start havolasini oching.');
 return {accepted:true};
}

export function verifyTelegramWebhookSecret(expected,supplied){return typeof expected==='string'&&typeof supplied==='string'&&expected.length>=32&&safeEqual(expected,supplied);}

export async function sendTelegramOtpCode(token,chatId,code,fetcher=fetch){
 return telegramRequest(token,'sendMessage',{chat_id:chatId,text:`UZTicket kirish kodi: ${code}\n\nKod 5 daqiqa amal qiladi. Uni hech kimga bermang. Nusxalash uchun quyidagi kodni bosing.`,reply_markup:{inline_keyboard:[[{text:code,copy_text:{text:code}}]]}},fetcher);
}
