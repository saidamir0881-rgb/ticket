'use client';
import {useEffect,useState} from 'react';
import {Heart} from 'lucide-react';
const key='uzticket-favorites';
function read(){try{const ids=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(ids)?ids.filter(x=>typeof x==='string'):[];}catch{return [];}}
export function useFavorites(){
  const [ids,setIds]=useState([]);
  useEffect(()=>{const sync=()=>setIds(read());sync();window.addEventListener('storage',sync);window.addEventListener('favorites-change',sync);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('favorites-change',sync);};},[]);
  function toggle(id){const current=read();const next=current.includes(id)?current.filter(x=>x!==id):[...current,id];setIds(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{}window.dispatchEvent(new Event('favorites-change'));}
  return {ids,toggle};
}
export default function FavoriteButton({eventId}){const {ids,toggle}=useFavorites();const saved=ids.includes(eventId);return <button type="button" className={`favorite-button ${saved?'saved':''}`} onClick={()=>toggle(eventId)} aria-pressed={saved} aria-label={saved?'Sevimlilardan olib tashlash':'Sevimlilarga saqlash'} title={saved?'Saqlangan':'Sevimlilarga saqlash'}><Heart size={19} fill={saved?'currentColor':'none'}/></button>;}
