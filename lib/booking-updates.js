export function mergeBookingUpdate(booking,update) {
  if(!update)return booking;
  // A poll started before payment must not overwrite a completed payment.
  if(booking.status!=='pending'&&update.status==='pending')return booking;
  if(booking.status==='paid'&&update.status!=='paid')return booking;
  return {...booking,...update};
}
