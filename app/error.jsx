'use client';
export default function ErrorPage({ reset }) { return <main className="container page-space empty-state"><h1>Sahifani yuklab bo‘lmadi</h1><p>Ulanishni tekshiring va qayta urinib ko‘ring.</p><button className="button" onClick={reset}>Qayta urinish</button></main>; }
