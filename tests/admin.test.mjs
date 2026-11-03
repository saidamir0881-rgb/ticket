import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bookingStatus,nextRowLabel,tashkentInput,tashkentTimestamp} from '../lib/admin-format.js';
test('expired unpaid bookings cannot display an actionable pending payment',()=>{
  const now=Date.parse('2026-11-03T10:00:00Z');
  assert.equal(bookingStatus({status:'pending',expires_at:'2026-11-03T09:59:59Z'},now),'expired');
  assert.equal(bookingStatus({status:'pending',expires_at:'2026-11-03T10:00:01Z'},now),'pending');
  assert.equal(bookingStatus({status:'paid',expires_at:'2026-11-03T09:59:59Z'},now),'paid');
});
test('adding a row after deletion avoids duplicate row labels',()=>{
  assert.equal(nextRowLabel([{label:'1'},{label:'3'}]),'2');
  assert.equal(nextRowLabel([{label:'VIP'},{label:'1'},{label:'2'}]),'3');
});
test('admin event date editing preserves Tashkent timezone with and without seconds',()=>{
  assert.equal(tashkentInput('2026-12-12T14:00:00Z'),'2026-12-12T19:00');
  assert.equal(new Date(tashkentTimestamp('2026-12-12T19:00')).toISOString(),'2026-12-12T14:00:00.000Z');
  assert.equal(new Date(tashkentTimestamp('2026-12-12T19:00:30')).toISOString(),'2026-12-12T14:00:30.000Z');
});
