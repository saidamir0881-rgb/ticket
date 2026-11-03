import Link from 'next/link';
export default function NotFound() { return <main className="container page-space empty-state"><span className="eyebrow">404</span><h1>Bu sahifa topilmadi</h1><p>Tadbir olib tashlangan yoki havola eskirgan bo‘lishi mumkin.</p><Link className="button" href="/events">Tadbirlarni ko‘rish</Link></main>; }
