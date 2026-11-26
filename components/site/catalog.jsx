'use client';
import {useMemo,useState} from 'react';
import {Search,SlidersHorizontal,Sparkles,Music2,Drama,Trophy,Mic2,PartyPopper,Heart,X,ArrowUpRight,CalendarDays} from 'lucide-react';
import {categories,money,date} from '@/lib/format';
import {useFavorites} from './favorites';
import EventCard from './event-card';

const icons={Sparkles,Music2,Drama,Trophy,Mic2,PartyPopper};
const localDay=value=>{const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');};

export default function Catalog({events,initialCategory='all',initialQuery='',compact=false}){
 const [category,setCategory]=useState(initialCategory),[query,setQuery]=useState(initialQuery),[sort,setSort]=useState('date'),[from,setFrom]=useState(''),[until,setUntil]=useState(''),[budget,setBudget]=useState(''),[venue,setVenue]=useState(''),[savedOnly,setSavedOnly]=useState(false),[searchFocused,setSearchFocused]=useState(false);
 const {ids}=useFavorites();
 const venues=[...new Set(events.map(e=>e.venue?.name).filter(Boolean))].sort();
 const normalizedQuery=query.trim().toLocaleLowerCase();
 const invalidRange=from&&until&&from>until;
 const suggestions=useMemo(()=>{
  if(normalizedQuery.length<2)return [];
  const matches=events.filter(e=>`${e.title} ${e.description||''} ${e.venue?.name||''}`.toLocaleLowerCase().includes(normalizedQuery));
  const unique=new Map();
  for(const event of matches){
   const key=event.title.trim().toLocaleLowerCase();
   if(!unique.has(key))unique.set(key,event);
   if(unique.size>=5)break;
  }
  return [...unique.values()];
 },[events,normalizedQuery]);
 const filtered=events.filter(e=>(category==='all'||e.category===category)&&(!savedOnly||ids.includes(e.id))&&`${e.title} ${e.description||''} ${e.venue?.name||''}`.toLocaleLowerCase().includes(normalizedQuery)&&(!venue||e.venue?.name===venue)&&(!budget||Number(e.min_price)<=Number(budget))&&(!from||localDay(e.ends_at||e.starts_at)>=from)&&(!until||localDay(e.starts_at)<=until)&&!invalidRange).sort((a,b)=>sort==='price'?a.min_price-b.min_price:sort==='price-desc'?b.min_price-a.min_price:new Date(a.starts_at)-new Date(b.starts_at));
 function chooseSuggestion(event){const performer=event.title.split(/[|—–(]/,1)[0].trim();setQuery(performer||event.title);setSearchFocused(false);}
 function toggleFavorites(){setSavedOnly(value=>!value);setCategory('all');}
 function reset(){setQuery('');setCategory('all');setFrom('');setUntil('');setBudget('');setVenue('');setSavedOnly(false);setSort('date');}

 return <div id="catalog" className={`catalog ${compact?'catalog-compact':''}`}>
  <div className="catalog-controls">
   <div className="catalog-tabs" aria-label="Tadbir turini tanlang">
    {categories.map(c=>{const Icon=icons[c.icon];return <button type="button" aria-pressed={category===c.id&&!savedOnly} key={c.id} className={category===c.id&&!savedOnly?'active':''} onClick={()=>{setCategory(c.id);setSavedOnly(false);}}><Icon size={16}/>{c.name}</button>;})}
    <button type="button" aria-pressed={savedOnly} className={`favorites-tab ${savedOnly?'active':''}`} onClick={toggleFavorites}><Heart size={16} fill={savedOnly?'currentColor':'none'}/>Sevimlilar{ids.length>0&&<span className="favorite-count">{ids.length}</span>}</button>
   </div>
   <div className="catalog-search-wrap">
    <label className={`catalog-search ${searchFocused?'focused':''}`}>
     <Search size={19}/><input aria-label="San’atkor yoki tadbir qidirish" aria-autocomplete="list" aria-expanded={searchFocused&&suggestions.length>0} placeholder="San’atkor yoki tadbirni qidiring" value={query} onFocus={()=>setSearchFocused(true)} onBlur={()=>setTimeout(()=>setSearchFocused(false),150)} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&suggestions[0]){e.preventDefault();chooseSuggestion(suggestions[0]);}if(e.key==='Escape')setSearchFocused(false);}}/>
     {query&&<button type="button" className="search-clear" aria-label="Qidiruvni tozalash" onMouseDown={e=>e.preventDefault()} onClick={()=>setQuery('')}><X size={16}/></button>}
    </label>
    {searchFocused&&suggestions.length>0&&<div className="search-suggestions" role="listbox" aria-label="Mos san’atkorlar va tadbirlar"><span className="suggestions-heading">MOS SAN’ATKORLAR VA TADBIRLAR</span>{suggestions.map(event=><button type="button" role="option" aria-selected="false" key={event.id} onMouseDown={e=>e.preventDefault()} onClick={()=>chooseSuggestion(event)}><span className="suggestion-icon"><Music2 size={16}/></span><span className="suggestion-copy"><strong>{event.title}</strong><small>{date(event.starts_at)} · {event.venue?.name||'Toshkent'}</small></span><ArrowUpRight size={15}/></button>)}</div>}
   </div>
  </div>
  {!compact&&<>
   <div className="catalog-filters">
    <label>Sana oralig‘i<input aria-label="Boshlanish sanasi" type="date" value={from} onChange={e=>setFrom(e.target.value)}/><span className="filter-separator">dan</span><input aria-label="Tugash sanasi" type="date" min={from||undefined} value={until} onChange={e=>setUntil(e.target.value)}/><span className="filter-separator">gacha</span></label>
    <label>Narx<select value={budget} onChange={e=>setBudget(e.target.value)}><option value="">Barcha narxlar</option>{[50000,100000,200000,500000,1000000].map(n=><option key={n} value={n}>{money(n)} gacha</option>)}</select></label>
    <label>Manzil<select value={venue} onChange={e=>setVenue(e.target.value)}><option value="">Barcha manzillar</option>{venues.map(n=><option key={n}>{n}</option>)}</select></label>
    <button type="button" className="filter-reset" onClick={reset}><X size={14}/>Tozalash</button>
   </div>
   {invalidRange&&<p role="alert" className="error-message">Tugash sanasi boshlanish sanasidan oldin bo‘lmasin.</p>}
   <div className="results-toolbar"><span role="status"><strong>{filtered.length}</strong> ta tadbir{savedOnly?' saqlanganlar ichida':''}</span><label><SlidersHorizontal size={15}/><select aria-label="Saralash" value={sort} onChange={e=>setSort(e.target.value)}><option value="date">Eng yaqin sana</option><option value="price">Avval arzonlari</option><option value="price-desc">Avval qimmatlari</option></select></label></div>
  </>}
  {filtered.length?<div className="events-grid">{filtered.map(e=><EventCard key={e.id} event={e}/>)}</div>:<div className="empty-state catalog-empty"><span className="empty-icon"><Search size={24}/></span><h3>{savedOnly?'Sevimlilarda hozircha tadbir yo‘q':normalizedQuery?'Mos tadbir topilmadi':'Tadbir topilmadi'}</h3><p>{savedOnly?'Yurak belgisini bosib yoqtirgan tadbirlaringizni shu yerda saqlang.':normalizedQuery?'San’atkor nomini boshqacha yozib ko‘ring yoki barcha tadbirlarni ko‘ring.':'Filtrlarni o‘zgartirib yana qidiring.'}</p><button className="button button-outline" onClick={reset}>Barcha tadbirlarni ko‘rish</button></div>}
 </div>;
}
