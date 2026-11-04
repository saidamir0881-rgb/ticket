import {notFound} from 'next/navigation';
import {serverClient} from '@/lib/supabase/server';
import FullTicket from '@/components/site/full-ticket';
export const dynamic='force-dynamic';
export const metadata={title:'Elektron chipta',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function TicketPage({params}) {
  const {token}=await params;if(!/^[a-f0-9]{64}$/i.test(token))notFound();
  const db=await serverClient();const {data,error}=await db.rpc('public_ticket',{p_token:token});
  if(error)return <main className="container page-space"><h1>Chiptani hozir ochib bo‘lmadi</h1><p>Keyinroq qayta urinib ko‘ring yoki tashkilotchiga murojaat qiling.</p></main>;
  if(!data)notFound();
  return <main className="container page-space"><h1>Elektron chipta</h1><FullTicket {...data}/><p className="fine-print">QR havolasi shaxsiy chiptangizga kirish beradi. Uni boshqalarga yubormang.</p></main>;
}
