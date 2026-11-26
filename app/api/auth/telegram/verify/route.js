import {z} from 'zod';
import {checkOrigin,failure} from '@/lib/api';
import {getTelegramOtpStore} from '@/lib/telegram-otp';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request){
 try{
  checkOrigin(request);
  const body=z.object({sessionId:z.string().uuid(),code:z.string().regex(/^\d{6}$/)}).parse(await request.json());
  return Response.json(await getTelegramOtpStore().verifyOtp(body.sessionId,body.code),{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return failure(error);}
}
