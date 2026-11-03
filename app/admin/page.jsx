import { authenticatedClient } from '@/lib/supabase/server';
import { money } from '@/lib/format';
export default async function Dashboard() {
  // Layout guards presentation; each data entry point independently guards authorization.
  let data, error;
  try { const { db } = await authenticatedClient(true); ({ data, error } = await db.rpc('admin_stats')); } catch(e) { error=e; }
  if (error) return <p className="error-message">{error.message}</p>;
  return <><div className="stats-grid">{[['Tadbirlar', data.events],['Buyurtmalar',data.bookings],['Sotilgan chiptalar',data.sold],['Bo‘sh joylar',data.available],['Kutilayotgan to‘lovlar',data.pending],['Tasdiqlangan tushum',money(data.revenue)]].map(([name,value]) => <div className="stat" key={name}><span>{name}</span><strong>{value}</strong></div>)}</div><p className="notice">Naqd pulni olgandan keyingina buyurtma to‘lovini tasdiqlang. Tasdiqlanganda chiptalar avtomatik yaratiladi. To‘langan buyurtmalarni bekor qilish va pul qaytarish alohida kassaviy jarayon talab qiladi.</p></>;
}
