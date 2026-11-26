import {z} from 'zod';
import {checkOrigin,failure} from '@/lib/api';
import {getTelegramOtpStore} from '@/lib/telegram-otp';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request){
 try{
  checkOrigin(request);
  const {phone}=z.object({phone:z.string().min(8).max(30)}).parse(await request.json());
  const username=String(process.env.TELEGRAM_OTP_BOT_USERNAME||'').replace(/^@/,'');
  if(!/^[A-Za-z0-9_]{5,32}$/.test(username))throw Object.assign(new Error('Telegram bot username server sozlamasida yo‘q.'),{status:503});
  if(!process.env.TELEGRAM_OTP_BOT_TOKEN||String(process.env.TELEGRAM_OTP_WEBHOOK_SECRET||'').length<32)throw Object.assign(new Error('Telegram OTP bot tokeni yoki webhook xavfsizlik kaliti sozlanmagan.'),{status:503});
  const forwarded=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||request.headers.get('x-real-ip')||'unknown';
  const session=await getTelegramOtpStore().startSession({phone,ip:forwarded});
  const url=new URL(`https://t.me/${username}`);url.searchParams.set('start',session.startToken);
  return Response.json({sessionId:session.sessionId,telegramUrl:url.href,expiresAt:session.expiresAt},{status:201,headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return failure(error);}
}
