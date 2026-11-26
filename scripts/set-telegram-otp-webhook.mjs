import fs from 'node:fs';

for(const file of ['.env.local','.env'])if(fs.existsSync(file)){try{process.loadEnvFile(file);}catch{}}

const token=process.env.TELEGRAM_OTP_BOT_TOKEN;
const username=String(process.env.TELEGRAM_OTP_BOT_USERNAME||'').replace(/^@/,'').toLowerCase();
const secret=process.env.TELEGRAM_OTP_WEBHOOK_SECRET;
const endpoint=process.env.TELEGRAM_OTP_WEBHOOK_URL;
if(!token||!username||!secret||secret.length<32||!endpoint)throw new Error('TELEGRAM_OTP_BOT_TOKEN, TELEGRAM_OTP_BOT_USERNAME, TELEGRAM_OTP_WEBHOOK_SECRET (32+ belgi) va TELEGRAM_OTP_WEBHOOK_URL kerak.');
const url=new URL(endpoint);
if(url.protocol!=='https:'||url.pathname!=='/api/telegram/otp-webhook')throw new Error('Webhook URL HTTPS va /api/telegram/otp-webhook bilan tugashi kerak.');

async function api(method,payload={}){
 let response;
 try{
  response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
  const body=await response.json();
  if(response.ok&&body.ok)return body.result;
 }catch{}
 throw new Error(`Telegram ${method} bajarilmadi (${response?.status||'network'}). Bot tokenini va internetni tekshiring.`);
}

const bot=await api('getMe');
if(String(bot.username||'').toLowerCase()!==username)throw new Error('TELEGRAM_OTP_BOT_USERNAME bot tokeniga mos emas.');
await api('setWebhook',{url:endpoint,secret_token:secret,allowed_updates:['message'],drop_pending_updates:false});
const info=await api('getWebhookInfo');
if(info.url!==endpoint)throw new Error('Telegram webhook manzilini tasdiqlab bo‘lmadi.');
console.log(`OTP webhook ulandi: @${bot.username} → ${url.origin}${url.pathname}`);
