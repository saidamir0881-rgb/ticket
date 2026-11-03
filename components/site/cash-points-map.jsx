'use client';
import {useEffect,useRef,useState} from 'react';
import {MapPin,Navigation} from 'lucide-react';
export default function CashPointsMap({points,selectedId,onSelect,testMode=false,readOnly=false}) {
  const container=useRef(null),map=useRef(null),markers=useRef(new Map()),[error,setError]=useState(false);
  const pointKey=JSON.stringify(points);
  const selected=points.find(p=>p.id===selectedId);
  useEffect(()=>{
    let cancelled=false;
    import('leaflet').then(module=>{
      if(cancelled)return;const L=module.default||module;
      const instance=L.map(container.current,{scrollWheelZoom:false}).setView([41.31,69.27],11);map.current=instance;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(instance).on('tileerror',()=>{if(!cancelled)setError(true);});
      for(const [i,p] of points.entries()) {
        const usable=p.is_active||(testMode&&p.is_demo);
        const marker=L.marker([Number(p.latitude),Number(p.longitude)],{icon:L.divIcon({className:'point-marker',html:`<span class="${p.is_active?'verified':'sample'}">${i+1}</span>`,iconSize:[30,36],iconAnchor:[15,36]})}).addTo(instance);
        const label=document.createElement('div');label.textContent=`${p.name} · ${p.is_demo?'Namuna, haqiqiy kassa emas':p.address}`;
        marker.bindPopup(label);
        marker.on('click',()=>{if(!readOnly&&usable)onSelect?.(p.id);});markers.current.set(p.id,marker);
      }
      if(points.length)instance.fitBounds(points.map(p=>[Number(p.latitude),Number(p.longitude)]),{padding:[25,25],maxZoom:13});
    }).catch(()=>setError(true));
    return()=>{cancelled=true;map.current?.remove();map.current=null;markers.current.clear();};
  },[pointKey,readOnly,testMode,onSelect]);
  useEffect(()=>{if(selected&&map.current){map.current.setView([Number(selected.latitude),Number(selected.longitude)],14);markers.current.get(selected.id)?.openPopup();}},[selected]);
  return <div className="cash-points"><div ref={container} className="cash-map" aria-label="Toshkent to‘lov punktlari xaritasi"/>{error&&<p className="fine-print">Xarita qatlamini yuklab bo‘lmadi. Manzillar quyidagi ro‘yxatda mavjud.</p>}{selected&&<a className="text-link purple" href={`https://www.openstreetmap.org/?mlat=${Number(selected.latitude)}&mlon=${Number(selected.longitude)}#map=16/${Number(selected.latitude)}/${Number(selected.longitude)}`} target="_blank" rel="noopener noreferrer"><Navigation size={14}/>Xaritada ochish</a>}<div className="cash-point-list">{points.map(p=>{const usable=p.is_active||(testMode&&p.is_demo);return <button key={p.id} type="button" className={selectedId===p.id?'cash-point selected':'cash-point'} disabled={readOnly||!usable} onClick={()=>onSelect?.(p.id)}><MapPin size={19}/><span><strong>{p.name}</strong><small>{p.district} · {p.address}</small><small>{p.hours}{p.phone?` · ${p.phone}`:''}</small>{p.is_demo&&<em>Namuna joylashuv — haqiqiy to‘lov qabul qilmaydi</em>}</span>{selectedId===p.id&&<i>✓</i>}</button>;})}</div></div>;
}
