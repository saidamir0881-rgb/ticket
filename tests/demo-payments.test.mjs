import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoCardCode} from '../lib/demo-cards.js';
import {mergeBookingUpdate} from '../lib/booking-updates.js';
test('only fictional fixture cards are accepted',()=>{
  assert.equal(demoCardCode('4242 4242 4242 4242'),'success');
  assert.equal(demoCardCode('4000000000000002'),'declined');
  assert.equal(demoCardCode('8600123456789012'),null);
  assert.equal(demoCardCode(''),null);
});
test('late polls cannot revert paid or cancelled bookings',()=>{
  const paid={id:'a',status:'paid',tickets:[{id:'qr'}],event:{title:'Demo'}};
  assert.deepEqual(mergeBookingUpdate(paid,{id:'a',status:'pending',tickets:[]}),paid);
  assert.equal(mergeBookingUpdate({status:'cancelled'},{status:'pending'}).status,'cancelled');
  const updated=mergeBookingUpdate({id:'a',status:'pending',event:{title:'Demo'}},{status:'paid',tickets:[{id:'qr'}]});
  assert.equal(updated.status,'paid');assert.equal(updated.event.title,'Demo');assert.equal(updated.tickets.length,1);
});
test('a stale poll cannot erase a submitted receipt or its extended deadline',()=>{
  const current={status:'pending',updated_at:'2026-11-03T12:00:00Z',payments:{status:'review'},expires_at:'2026-11-04T12:00:00Z'};
  assert.deepEqual(mergeBookingUpdate(current,{status:'pending',updated_at:'2026-11-03T11:59:59Z',payments:{status:'pending'}}),current);
  assert.deepEqual(mergeBookingUpdate(current,{status:'pending',payments:{status:'pending'}}),current);
  assert.equal(mergeBookingUpdate(current,{status:'paid',updated_at:'2026-11-03T12:01:00Z',payments:{status:'paid'}}).status,'paid');
});
