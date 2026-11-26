import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';

function encryptionKey(secret=process.env.TELEGRAM_OTP_HASH_SECRET){
 if(typeof secret!=='string'||secret.length<32)throw new Error('Telegram link encryption secret is not configured.');
 return createHash('sha256').update(`uzticket-telegram-link:${secret}`).digest();
}

export function encryptTelegramAuthLink(telegramUserId,chatId,secret){
 if(!Number.isSafeInteger(telegramUserId)||!Number.isSafeInteger(chatId))throw new Error('Telegram ID is invalid.');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey(secret),iv);
 const encrypted=Buffer.concat([cipher.update(JSON.stringify({telegramUserId,chatId}),'utf8'),cipher.final()]);
 return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptTelegramAuthLink(value,secret){
 try{
  const [version,ivText,tagText,dataText]=String(value||'').split('.');if(version!=='v1'||!ivText||!tagText||!dataText)return null;
  const decipher=createDecipheriv('aes-256-gcm',encryptionKey(secret),Buffer.from(ivText,'base64url'));
  decipher.setAuthTag(Buffer.from(tagText,'base64url'));
  const clear=Buffer.concat([decipher.update(Buffer.from(dataText,'base64url')),decipher.final()]);
  const link=JSON.parse(clear.toString('utf8'));
  return Number.isSafeInteger(link.telegramUserId)&&Number.isSafeInteger(link.chatId)?link:null;
 }catch{return null;}
}
