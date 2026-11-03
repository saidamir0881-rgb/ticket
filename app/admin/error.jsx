'use client';
export default function AdminError({reset}) {return <div className="panel empty-state"><h2>Bo‘limni yuklab bo‘lmadi</h2><p>Internet ulanishini tekshiring va qayta urinib ko‘ring.</p><button className="button" onClick={reset}>Qayta yuklash</button></div>;}
