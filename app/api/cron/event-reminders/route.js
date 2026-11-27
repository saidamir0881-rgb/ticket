import {serviceClient} from '@/lib/supabase/service';
import {decryptTelegramAuthLink} from '@/lib/telegram-auth-link';

export const runtime='nodejs';
export const dynamic='force-dynamic';

async function sendTelegram(chatId,text){
 const token=process.env.TELEGRAM_OTP_BOT_TOKEN;if(!token)throw new Error('Telegram bot sozlanmagan.');
 const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id:chatId,text}),signal:AbortSignal.timeout(8000)});
 const result=await response.json();if(!response.ok||!result.ok)throw new Error('Telegram xabarini yuborib bo‘lmadi.');
}
function localDate(value){return new Date(value).toLocaleString('uz-UZ',{timeZone:'Asia/Tashkent',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});}

export async function GET(request){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return Response.json({error:'Unauthorized'},{status:401});
 try{
  const db=serviceClient(),now=new Date(),horizon=new Date(now.getTime()+49*60*60*1000);
  const {data:events,error:eventError}=await db.from('events').select('id,title,starts_at,venue:venues(name)').eq('status','published').gt('starts_at',now.toISOString()).lte('starts_at',horizon.toISOString());if(eventError)throw eventError;
  const eventMap=new Map((events||[]).map(event=>[event.id,event]));
  const eventIds=[...eventMap.keys()];
  if(eventIds.length){
   const {data:bookings,error:bookingsError}=await db.from('bookings').select('id,user_id,event_id').eq('status','paid').in('event_id',eventIds);if(bookingsError)throw bookingsError;
   if(bookings?.length){const rows=bookings.map(booking=>({booking_id:booking.id,user_id:booking.user_id,event_id:booking.event_id,scheduled_for:new Date(new Date(eventMap.get(booking.event_id).starts_at).getTime()-24*60*60*1000).toISOString()}));const {error}=await db.from('event_reminders').upsert(rows,{onConflict:'booking_id,scheduled_for',ignoreDuplicates:true});if(error)throw error;}
   const {data:favorites,error:favoritesError}=await db.from('favorite_events').select('user_id,event_id').eq('notify',true).in('event_id',eventIds);if(favoritesError)throw favoritesError;
   if(favorites?.length){const rows=favorites.map(item=>({user_id:item.user_id,event_id:item.event_id,scheduled_for:new Date(new Date(eventMap.get(item.event_id).starts_at).getTime()-24*60*60*1000).toISOString()}));const {error}=await db.from('favorite_event_reminders').upsert(rows,{onConflict:'user_id,event_id',ignoreDuplicates:true});if(error)throw error;}
  }
  const [{data:bookingReminders,error:brError},{data:favoriteReminders,error:frError}]=await Promise.all([
   db.from('event_reminders').select('id,user_id,event_id,event:events(title,starts_at,venue:venues(name))').is('sent_at',null).lte('scheduled_for',now.toISOString()).limit(100),
   db.from('favorite_event_reminders').select('id,user_id,event_id,event:events(title,starts_at,venue:venues(name))').is('sent_at',null).lte('scheduled_for',now.toISOString()).limit(100),
  ]);if(brError)throw brError;if(frError)throw frError;
  let sent=0,skipped=0,failed=0;
  for(const item of [...(bookingReminders||[]).map(row=>({...row,kind:'ticket'})),...(favoriteReminders||[]).map(row=>({...row,kind:'favorite'}))]){
   try{
    const {data,error}=await db.auth.admin.getUserById(item.user_id);if(error||!data?.user){skipped++;continue;}
    const link=decryptTelegramAuthLink(data.user.app_metadata?.telegram_otp_link);if(!link?.chatId){skipped++;continue;}
    const event=item.event;if(!event){skipped++;continue;}
    const reason=item.kind==='ticket'?'Sizning chiptangiz bor:':'Sevimlilarga qo‘shgan tadbiringiz yaqinlashmoqda:';
    const message=`🎟 UZTicket eslatmasi\n\n${reason} ${event.title}\n📅 ${localDate(event.starts_at)}\n📍 ${event.venue?.name||'Manzil saytda ko‘rsatilgan'}\n\nChiptalaringiz: https://ticket-pi-six.vercel.app/account`;
    await sendTelegram(link.chatId,message);
    const table=item.kind==='ticket'?'event_reminders':'favorite_event_reminders';const {error:updateError}=await db.from(table).update({sent_at:new Date().toISOString()}).eq('id',item.id);if(updateError)throw updateError;sent++;
   }catch{failed++;}
  }
  return Response.json({ok:true,scheduledEvents:eventIds.length,sent,skipped,failed});
 }catch(error){return Response.json({error:error.message||'Reminder cron failed.'},{status:500});}
}
