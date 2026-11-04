'use client';
import {useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {date,time,money} from '@/lib/format';
export default function FullTicket({ticket,event,seat,reference,invalid=false}) {
  const [image,setImage]=useState(''),[error,setError]=useState(false);
  useEffect(()=>{let active=true;setError(false);(async()=>{
    const canvas=document.createElement('canvas');canvas.width=800;canvas.height=1120;
    const c=canvas.getContext('2d');c.fillStyle='#f4f0ff';c.fillRect(0,0,800,1120);c.fillStyle='#fff';c.fillRect(32,32,736,1056);
    c.fillStyle='#6c3cff';c.fillRect(32,32,736,115);c.fillStyle='#fff';c.font='bold 42px Arial';c.fillText('UZTICKET',65,105);
    c.fillStyle='#171126';c.font='bold 32px Arial';let y=210;const words=(event?.title||'Elektron chipta').split(' ');let line='';for(const word of words){if(c.measureText(line+word).width>660){c.fillText(line,65,y);y+=42;line='';}line+=word+' ';}c.fillText(line,65,y);y+=70;
    c.font='24px Arial';const lines=[event?.starts_at?`${date(event.starts_at)} ${new Date(event.starts_at).getFullYear()} · ${time(event.starts_at)}`:'',event?.venue?.name||'',`${seat?.row_label||'—'}-qator · ${seat?.seat_number||'—'}-joy`,seat?.price!=null?money(seat.price):'',reference||''];
    for(const text of lines){c.fillText(text.slice(0,52),65,y);y+=42;}
    c.fillStyle=invalid?'#b42318':'#176c44';c.font='bold 24px Arial';c.fillText(invalid?'ARXIV · KIRISH UCHUN YAROQSIZ':ticket.used_at?'CHIPTA ISHLATILGAN':'ELEKTRON CHIPTA',65,600);
    const url=new URL(`/tickets/${ticket.qr_token}`,window.location.origin).href;
    const qr=await QRCode.toDataURL(url,{width:320,margin:2,errorCorrectionLevel:'M'});const img=new Image();img.src=qr;await img.decode();c.drawImage(img,240,650,320,320);c.fillStyle='#62596e';c.font='19px Arial';c.fillText('Chiptani ochish uchun QR kodni skanerlang',205,1010);
    if(active)setImage(canvas.toDataURL('image/png'));
  })().catch(()=>{if(active)setError(true);});return()=>{active=false;};},[ticket,event,seat,reference,invalid]);
  return <div style={{maxWidth:420,margin:'16px auto',width:'100%'}}>{image?<><img src={image} alt={`${event?.title||'Tadbir'} elektron chiptasi`} style={{width:'100%',height:'auto'}}/><a className="button" href={image} download={`uzticket-${ticket.id}.png`}>Chiptani yuklab olish</a></>:<p role="status">{error?'Chipta rasmini yaratib bo‘lmadi. Sahifani qayta oching.':'Chipta tayyorlanmoqda…'}</p>}</div>;
}
