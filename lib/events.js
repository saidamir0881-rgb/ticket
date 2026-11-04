import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseKey } from './supabase/config';
import catalog from './data/official-events.json';
import retiredIds from './data/retired-events.json';
function publicClient() {
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(8000), cache: 'no-store' }) } });
}
export async function listEvents() {
  let local=[];
  try {
    const {data,error}=await publicClient().from('events').select('*, venue:venues(*)').eq('status','published').eq('is_demo',false).order('starts_at');
    if(!error)local=data||[];
  } catch { /* The verified external catalog is available without database access. */ }
  const records=new Map(catalog.map(e=>[e.id,{...e,inventory_mode:'local'}]));
  for(const event of local){
    const saved=records.get(event.id);
    records.set(event.id,{...saved,...event,...(saved?{poster_url:saved.poster_url,poster_background_url:saved.poster_background_url,inventory_mode:'local',...(event.inventory_mode==='external'?{min_price:saved.min_price,max_price:saved.max_price}:{})}:{})});
  }
  return {events:[...records.values()].filter(e=>!retiredIds.includes(e.id)&&new Date(e.ends_at||e.starts_at)>new Date()).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)),setup:false};
}
export async function getEvent(id) {
  return (await listEvents()).events.find(e=>e.id===id)||null;
}
export function groupVenues(events) {
  const groups=new Map();
  for(const event of events){
    if(!event.venue)continue;
    const v=event.venue;
    const key=[v.city,v.name,v.address].map(x=>(x||'').toLocaleLowerCase().replace(/[\s??".,]+/g,' ').trim()).join('|');
    let group=groups.get(key);
    if(!group){group={...v,venue_ids:[],events:[],image_url:event.poster_background_url||event.poster_url||v.image_url};groups.set(key,group);}
    if(!group.venue_ids.includes(v.id))group.venue_ids.push(v.id);
    group.events.push(event);
  }
  return [...groups.values()].sort((a,b)=>b.events.length-a.events.length||a.name.localeCompare(b.name));
}
export async function listVenues() {
  return groupVenues((await listEvents()).events);
}
