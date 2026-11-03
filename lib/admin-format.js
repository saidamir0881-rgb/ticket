export function bookingStatus(booking,now=Date.now()) {
  return booking.status==='pending' && new Date(booking.expires_at).getTime()<=now ? 'expired' : booking.status;
}
export function nextRowLabel(rows) {
  const labels=new Set(rows.map(row=>String(row.label)));
  let n=1; while(labels.has(String(n))) n++;
  return String(n);
}
export function tashkentInput(value) {
  return value?new Date(new Date(value).getTime()+5*3600000).toISOString().slice(0,16):'';
}
export function tashkentTimestamp(value) {
  return `${value.length===16?value+':00':value}+05:00`;
}
