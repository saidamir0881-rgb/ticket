'use client';
import { useState } from 'react';
import { Headphones, Send, X, ArrowUpRight } from 'lucide-react';
import { supportUrl } from '@/lib/support';

export default function SupportWidget() {
  const [open, setOpen] = useState(false);
  return <aside className="support-widget" aria-label="Yordam xizmati">
    {open && <div className="support-popover" id="support-popover">
      <div className="support-popover-head"><Headphones size={26} /><div><strong>Sizni tinglaymiz.</strong><small>UZTICKET yordam xizmati</small></div><button onClick={() => setOpen(false)} aria-label="Yordam oynasini yopish"><X size={18} /></button></div>
      <p>Chiptangiz, to‘lov yoki buyurtmangiz bo‘yicha yordam kerakmi?</p>
      <a className="support-primary" href={supportUrl} target="_blank" rel="noopener noreferrer"><Send size={18} /> Telegram’da yozish <ArrowUpRight size={17} /></a>
      <a className="support-secondary" href="/help">Ko‘p so‘raladigan savollar →</a>
      <small>Murojaatlar 24/7 qabul qilinadi. Administrator imkon qadar tez javob beradi.</small>
    </div>}
    <button className="support-launcher" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="support-popover"><Headphones size={23} /><span>Yordam kerakmi?<small>24/7 murojaat qoldiring</small></span><span className="support-status" /></button>
  </aside>;
}
