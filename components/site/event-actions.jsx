'use client';
import {useState} from 'react';
import {Share2,CalendarPlus,MapPin} from 'lucide-react';
import FavoriteButton from './favorites';
export default function EventActions({event}){
  const [message,setMessage]=useState('');
  async function share(){const url=window.location.href.split('#')[0];try{if(navigator.share)await navigator.share({title:event.title,url});else{await navigator.clipboard.writeText(url);setMessage('Havola nusxalandi.');}}catch(e){if(e.name!=='AbortError')setMessage('Havolani manzil satridan nusxalashingiz mumkin.');}}
  function calendar(){
    const escape=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
    const stamp=s=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//UZTICKET//Events//UZ','BEGIN:VEVENT',`UID:${event.id}@uzticket`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(event.starts_at)}`,...(event.ends_at&&new Date(event.ends_at)>new Date(event.starts_at)?[`DTEND:${stamp(event.ends_at)}`]:[]),`SUMMARY:${escape(event.title)}`,`LOCATION:${escape([event.venue?.name,event.venue?.address].filter(Boolean).join(', '))}`,`DESCRIPTION:${escape('Tadbir eslatmasi. Bu chipta emas. '+window.location.href.split('#')[0])}`,'END:VEVENT','END:VCALENDAR'];
    // Fold at 75 UTF-8 octets without splitting Unicode characters (RFC 5545).
    const folded=lines.map(line=>{let output='',part='';for(const c of line){if(new TextEncoder().encode(part+c).length>74){output+=part+'\r\n';part=' ';}part+=c;}return output+part;}).join('\r\n')+'\r\n';
    const url=URL.createObjectURL(new Blob([folded],{type:'text/calendar;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`uzticket-${event.id}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Kalendarga qo‘shish fayli yuklandi.');
  }
  const location=encodeURIComponent([event.venue?.name,event.venue?.address,event.venue?.city].filter(Boolean).join(', '));
  return <div className="event-actions"><FavoriteButton eventId={event.id}/><button className="button button-outline" onClick={share}><Share2 size={16}/>Ulashish</button><button className="button button-outline" onClick={calendar}><CalendarPlus size={16}/>Kalendarga qo‘shish</button><a className="button button-outline" href={`https://www.google.com/maps/search/?api=1&query=${location}`} target="_blank" rel="noopener noreferrer"><MapPin size={16}/>Manzilga borish</a><p className="fine-print" role="status">{message}</p></div>;
}
