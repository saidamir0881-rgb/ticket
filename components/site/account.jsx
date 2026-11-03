'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { Ticket, LogOut } from 'lucide-react';
import { browserClient } from '@/lib/supabase/browser';
import { date, time, money, statusName } from '@/lib/format';
function TicketCard({ ticket, items }) {
  const [qr, setQr] = useState('');
  const item = items.find(i => i.id === ticket.booking_seat_id);
  useEffect(() => { QRCode.toDataURL(ticket.qr_token, { width: 280, margin: 2, errorCorrectionLevel: 'M' }).then(setQr).catch(() => toast.error('QR yaratib bo‘lmadi. Sahifani yangilang.')); }, [ticket.qr_token]);
  return <div className="ticket-card">{qr ? <img src={qr} alt="Shaxsiy kirish QR chiptasi" /> : <div className="skeleton" style={{ width: 110, height: 110 }} />}<div><strong>{item?.seat?.row_label}-qator · {item?.seat?.seat_number}-joy</strong><p>{ticket.used_at ? 'Chipta ishlatilgan' : 'Kirishda QR kodni ko‘rsating'}</p>{qr && <a className="text-link purple" href={qr} download={`uzticket-${ticket.id}.png`}>QR yuklab olish</a>}</div></div>;
}
function Booking({ booking, now, onCancel }) {
  const left = Math.max(0, Math.ceil((new Date(booking.expires_at).getTime() - now) / 1000));
  const status = booking.status === 'pending' && left === 0 ? 'expired' : booking.status;
  return <article className="booking-card"><div className="booking-card-top"><span className="booking-reference">{booking.reference}</span><span className={`badge ${status}`}>{statusName(status)}</span></div><h3>{booking.event?.title || 'Tadbir'}</h3><p>{booking.event?.venue?.name} · {booking.event && date(booking.event.starts_at)} · {booking.event && time(booking.event.starts_at)}</p><div className="booking-facts"><span>{booking.items?.map(i => `${i.seat?.row_label}-qator / ${i.seat?.seat_number}-joy`).join(', ')}</span><strong>{money(booking.total)}</strong></div>{status === 'pending' && <><div className="countdown">To‘lash uchun qoldi: <strong>{Math.floor(left / 60)}:{String(left % 60).padStart(2,'0')}</strong> · Kassada buyurtma raqamini ko‘rsating.</div><p>{booking.event?.venue?.address}. To‘lov faqat naqd.</p><button className="button button-danger" onClick={() => onCancel(booking.id)}>Bandni bekor qilish</button></>}{status === 'paid' && <div className="tickets-grid">{booking.tickets?.map(t => <TicketCard key={t.id} ticket={t} items={booking.items || []} />)}</div>}</article>;
}
export default function Account({ profile, email, bookings }) {
  const [now, setNow] = useState(Date.now()), [busy, setBusy] = useState(false), [cancelBusy, setCancelBusy] = useState(false);
  const router = useRouter();
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); const refresh = setInterval(() => router.refresh(), 30000); return () => { clearInterval(t); clearInterval(refresh); }; }, [router]);
  async function save(e) {
    e.preventDefault(); setBusy(true);
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try { const { error } = await browserClient().from('profiles').update(values).eq('id', profile.id); if (error) throw error; toast.success('Profil saqlandi.'); router.refresh(); } catch(e) { toast.error(e.message); } finally { setBusy(false); }
  }
  async function cancel(id) {
    if (cancelBusy || !confirm('Band qilishni bekor qilasizmi?')) return;
    setCancelBusy(true);
    try { const res = await fetch(`/api/bookings/${id}`, { method:'DELETE' }); const result = await res.json(); if (!res.ok) throw new Error(result.error); toast.success('Band bekor qilindi.'); router.refresh(); } catch(e) { toast.error(e.message); } finally { setCancelBusy(false); }
  }
  async function logout() { const { error } = await browserClient().auth.signOut(); if (error) toast.error(error.message); else { router.push('/'); router.refresh(); } }
  return <div className="account-layout"><aside className="panel account-sidebar"><h3>Shaxsiy ma’lumotlar</h3><p className="fine-print" style={{ marginBottom: 20 }}>{email}</p><form onSubmit={save}><label className="field">Ism<input name="full_name" defaultValue={profile.full_name} required maxLength={100} /></label><label className="field">Telefon<input name="phone" type="tel" defaultValue={profile.phone} maxLength={30} placeholder="+998" /></label><button className="button" disabled={busy}>{busy ? 'Saqlanmoqda...' : 'Saqlash'}</button></form><button className="button button-outline" onClick={logout}><LogOut size={15} />Chiqish</button></aside><section aria-busy={cancelBusy}><h2 style={{ fontSize: 25 }}>Buyurtmalar va chiptalar</h2>{bookings.length ? bookings.map(b => <Booking booking={b} now={now} onCancel={cancel} key={b.id} />) : <div className="empty-state"><Ticket size={35} /><h3>Hali rejalaringiz yo‘qmi?</h3><p>Birinchi tadbiringizni tanlash vaqti keldi.</p><Link className="button" href="/events">Tadbirlarni ko‘rish</Link></div>}</section></div>;
}
