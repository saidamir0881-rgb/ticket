export function mergeBookingUpdate(booking,update) {
  if(!update)return booking;
  if(booking.updated_at&&update.updated_at&&new Date(update.updated_at)<new Date(booking.updated_at))return booking;
  const previousPayment=Array.isArray(booking.payments)?booking.payments[0]:booking.payments;
  const nextPayment=Array.isArray(update.payments)?update.payments[0]:update.payments;
  if(previousPayment?.status==='review'&&nextPayment?.status==='pending'&&update.status==='pending')return booking;
  // A poll started before payment must not overwrite a completed payment.
  if(booking.status!=='pending'&&update.status==='pending')return booking;
  if(booking.status==='paid'&&update.status!=='paid')return booking;
  return {...booking,...update};
}
