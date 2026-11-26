import {z} from 'zod';
import {failure} from '@/lib/api';
import {getTelegramOtpStore} from '@/lib/telegram-otp';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(_request,{params}){
 try{
  const {sessionId}=await params;
  z.string().uuid().parse(sessionId);
  const status=await getTelegramOtpStore().getStatus(sessionId);
  if(!status)throw Object.assign(new Error('Tasdiqlash sessiyasi topilmadi. Yangi kod so‘rang.'),{status:404});
  return Response.json(status,{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return failure(error);}
}
