import test from 'node:test';
import assert from 'node:assert/strict';
import {createTelegramOtpStore,handleTelegramOtpUpdate,normalizeUzPhone,verifyTelegramWebhookSecret} from '../lib/telegram-otp.js';
import {decryptTelegramAuthLink,encryptTelegramAuthLink} from '../lib/telegram-auth-link.js';

const secret='0123456789abcdef0123456789abcdef0123456789abcdef';
function telegramMock(sent){
 return async (url,init)=>{
  const method=url.split('/').pop(),body=JSON.parse(init.body);sent.push({method,body});
  return {ok:true,status:200,json:async()=>({ok:true,result:{message_id:sent.length}})};
 };
}

test('Uzbek phone numbers normalize to E.164',()=>{
 assert.equal(normalizeUzPhone('+998 90 123 45 67'),'+998901234567');
 assert.equal(normalizeUzPhone('90-123-45-67'),'+998901234567');
 assert.equal(normalizeUzPhone('998901234567'),'+998901234567');
 assert.equal(normalizeUzPhone('12345'),null);
});

test('Telegram chat links are encrypted and reject tampered values',()=>{
 const encrypted=encryptTelegramAuthLink(123456,123456,secret);
 assert.deepEqual(decryptTelegramAuthLink(encrypted,secret),{telegramUserId:123456,chatId:123456});
 assert.equal(decryptTelegramAuthLink(encrypted,secret+'wrong'),null);
 assert.equal(decryptTelegramAuthLink(encrypted.slice(0,-2)+'aa',secret),null);
});

test('Telegram OTP flow accepts only the owner contact and single-use start token',async()=>{
 const store=createTelegramOtpStore({secret}),session=store.startSession({phone:'+998 90 123 45 67',ip:'test'}),sent=[],fetcher=telegramMock(sent);
 const update=(message)=>({update_id:1,message:{chat:{id:777,type:'private'},from:{id:777,is_bot:false},...message}});
 const started=await handleTelegramOtpUpdate(store,update({text:`/start ${session.startToken}`}),{token:'fake',fetcher});
 assert.equal(started.accepted,true);
 assert.equal(sent[0].body.reply_markup.keyboard[0][0].request_contact,true);
 const replay=await handleTelegramOtpUpdate(store,update({text:`/start ${session.startToken}`}),{token:'fake',fetcher});
 assert.equal(replay.accepted,true);
 const foreign=await handleTelegramOtpUpdate(store,update({contact:{phone_number:'+998901234567',user_id:999}}),{token:'fake',fetcher});
 assert.equal(foreign.reason,'not_own_contact');
 assert.equal(store.getStatus(session.sessionId).status,'waiting_contact');
 const mismatch=await handleTelegramOtpUpdate(store,update({contact:{phone_number:'+998901234568',user_id:777}}),{token:'fake',fetcher});
 assert.equal(mismatch.reason,'phone_mismatch');
 const accepted=await handleTelegramOtpUpdate(store,update({contact:{phone_number:'+998901234567',user_id:777}}),{token:'fake',fetcher});
 assert.equal(accepted.accepted,true);
 assert.equal(store.getStatus(session.sessionId).status,'otp_sent');
 const code=sent.at(-1).body.text.match(/\n\n(\d{6})\n\n/)[1];
 const duplicateContact=await handleTelegramOtpUpdate(store,update({contact:{phone_number:'+998901234567',user_id:777}}),{token:'fake',fetcher});
 assert.equal(duplicateContact.reason,'already_sent');
 assert.deepEqual(store.verifyOtp(session.sessionId,code),{status:'verified'});
 assert.deepEqual(store.claimRegistration(session.sessionId,'+998901234567'),{sessionId:session.sessionId,phone:'+998901234567',telegramUserId:777,chatId:777});
 store.releaseRegistration(session.sessionId);
 assert.deepEqual(store.claimRegistration(session.sessionId,'+998901234567'),{sessionId:session.sessionId,phone:'+998901234567',telegramUserId:777,chatId:777});
 store.finishRegistration(session.sessionId);
 assert.equal(store.getStatus(session.sessionId),null);
});

test('plain Telegram /start shows password reset and registration choices',async()=>{
 const store=createTelegramOtpStore({secret}),sent=[],fetcher=telegramMock(sent);
 const result=await handleTelegramOtpUpdate(store,{message:{chat:{id:777,type:'private'},from:{id:777,is_bot:false},text:'/start account'}},{token:'fake',fetcher});
 assert.equal(result.menu,true);
 assert.deepEqual(sent[0].body.reply_markup.inline_keyboard.flat().map(button=>button.text),['🔐 Parolni tiklash','🎟 Ro‘yxatdan o‘tish']);
 assert.equal(sent[0].body.reply_markup.inline_keyboard[0][0].url.endsWith('/reset-password'),true);
 assert.equal(sent[0].body.reply_markup.inline_keyboard[1][0].url.endsWith('/register'),true);
});

test('verified existing-phone session can be claimed once for password reset',()=>{
 const store=createTelegramOtpStore({secret}),session=store.startSession({phone:'901234567',ip:'reset'});
 store.bindStartToken(session.startToken,123,123);const {otp}=store.acceptContact(123,{phone_number:'+998901234567',user_id:123});
 store.verifyOtp(session.sessionId,otp);
 assert.deepEqual(store.claimPasswordReset(session.sessionId,'+998901234567'),{sessionId:session.sessionId,phone:'+998901234567',telegramUserId:123,chatId:123});
 assert.throws(()=>store.claimPasswordReset(session.sessionId,'+998901234567'),{status:403});
 store.releaseRegistration(session.sessionId);
 assert.deepEqual(store.claimPasswordReset(session.sessionId,'+998901234567'),{sessionId:session.sessionId,phone:'+998901234567',telegramUserId:123,chatId:123});
 store.finishRegistration(session.sessionId);assert.equal(store.getStatus(session.sessionId),null);
});

test('verified OTP exposes the linked Telegram identity only to the server login completion step',()=>{
 const store=createTelegramOtpStore({secret}),session=store.startSession({phone:'901234567',ip:'login'});
 store.bindStartToken(session.startToken,456,456);const {otp}=store.acceptContact(456,{phone_number:'+998901234567',user_id:456});
 store.verifyOtp(session.sessionId,otp);
 assert.deepEqual(store.claimLoginCompletion(session.sessionId,'+998901234567'),{sessionId:session.sessionId,phone:'+998901234567',telegramUserId:456,chatId:456});
 store.finishRegistration(session.sessionId);assert.equal(store.getStatus(session.sessionId),null);
});

test('five wrong OTP attempts block a session and phone starts are rate limited',()=>{
 const store=createTelegramOtpStore({secret}),session=store.startSession({phone:'901234567',ip:'one'});
 store.bindStartToken(session.startToken,123,123);
 const {otp}=store.acceptContact(123,{phone_number:'+998901234567',user_id:123}),wrong=otp==='000000'?'000001':'000000';
 for(let i=0;i<4;i++)assert.throws(()=>store.verifyOtp(session.sessionId,wrong));
 assert.throws(()=>store.verifyOtp(session.sessionId,wrong),{status:429});
 assert.equal(store.getStatus(session.sessionId).status,'blocked');
 store.startSession({phone:'901234568',ip:'two'});
 store.startSession({phone:'901234568',ip:'two'});
 store.startSession({phone:'901234568',ip:'two'});
 assert.throws(()=>store.startSession({phone:'901234568',ip:'two'}),{status:429});
});

test('expired OTP and webhook secret validation are enforced',()=>{
 let now=1000;const store=createTelegramOtpStore({secret,now:()=>now,otpTtlMs:500});
 const session=store.startSession({phone:'901234567',ip:'x'});store.bindStartToken(session.startToken,123,123);store.acceptContact(123,{phone_number:'+998901234567',user_id:123});
 now+=501;
 assert.equal(store.getStatus(session.sessionId).status,'expired');
 assert.throws(()=>store.verifyOtp(session.sessionId,'123456'),{status:410});
 assert.equal(verifyTelegramWebhookSecret(secret,secret),true);
 assert.equal(verifyTelegramWebhookSecret(secret,'wrong'),false);
 assert.equal(verifyTelegramWebhookSecret('short','short'),false);
});

test('OTP keeps its full five-minute lifetime when contact sharing happens near the start-link expiry',()=>{
 let now=1000;const store=createTelegramOtpStore({secret,now:()=>now,otpTtlMs:5*60*1000,startTtlMs:10*60*1000});
 const session=store.startSession({phone:'901234567',ip:'late'});
 now+=9*60*1000;store.bindStartToken(session.startToken,456,456);store.acceptContact(456,{phone_number:'+998901234567',user_id:456});
 now+=4*60*1000;
 assert.equal(store.getStatus(session.sessionId).status,'otp_sent');
 now+=60*1000+1;
 assert.equal(store.getStatus(session.sessionId).status,'expired');
});
