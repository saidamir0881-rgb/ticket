import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

// Executes the real PostgreSQL migration in embedded PostgreSQL. Only Supabase's
// managed auth/storage scaffolding and pgcrypto randomness are stubbed here.
// Production uses pgcrypto, not this test-only implementation.
const db = new PGlite();
const admin='00000000-0000-4000-8000-000000000001';
const alice='00000000-0000-4000-8000-000000000002';
const bob='00000000-0000-4000-8000-000000000003';
let event, seats;
async function owner() { await db.exec('reset role'); }
async function asUser(id,role='authenticated') {
  await owner();
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id || '']);
  await db.exec(`set role ${role}`);
}
async function rpc(name,args=[]) {
  const placeholders=args.map((_,i)=>`$${i+1}`).join(',');
  return (await db.query(`select public.${name}(${placeholders}) as value`,args)).rows[0].value;
}
before(async()=>{
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage; create schema extensions;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create function extensions.gen_random_bytes(n int) returns bytea language sql volatile as $$ select decode(string_agg(md5(random()::text),''),'hex') from generate_series(1,ceil(n/16.0)::int) $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
  `);
  const migration=await readFile(new URL('../supabase/migrations/202611030001_uzticket.sql',import.meta.url),'utf8');
  await db.exec(migration.replace('create extension if not exists pgcrypto with schema extensions;',''));
  await db.exec(await readFile(new URL('../supabase/migrations/202611030003_demo_card_payments.sql',import.meta.url),'utf8'));
  await db.query('insert into auth.users(id) values($1),($2),($3)',[admin,alice,bob]);
  await db.query("update public.profiles set role='admin' where id=$1",[admin]);
  const venue=(await db.query(`insert into public.venues(name,address,layout) values('Test Hall','Test address','[{"label":"1","count":8,"price":100000,"category":"VIP"}]') returning id`)).rows[0].id;
  await asUser(admin);
  event=await rpc('create_event_with_seats',[{title:'Test event',venue_id:venue,category:'concert',starts_at:'2099-12-12T19:00:00+05:00',status:'published'}]);
  seats=(await db.query('select id from public.seats where event_id=$1 order by seat_number',[event])).rows.map(r=>r.id);
});
after(async()=>{await db.close();});

test('exactly one admin and customers cannot grant themselves privileges',async()=>{
  await owner();
  await assert.rejects(db.query("update public.profiles set role='admin' where id=$1",[alice]),/unique|duplicate/i);
  await asUser(alice);
  await assert.rejects(db.query("update public.profiles set role='admin' where id=$1",[alice]),/permission/i);
  await assert.rejects(rpc('admin_stats'),/Admin/);
  await assert.rejects(db.query("insert into public.venues(name,address) values('Bad','Bad')"),/row.level|policy/i);
  await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('event-posters','bad.png')"),/row.level|policy/i);
});
test('atomic reservation, price snapshot, no duplicate claims, isolated owner reads',async()=>{
  await asUser(alice);
  const booking=await rpc('reserve_seats',[event,[seats[0],seats[1]]]);
  assert.equal(booking.total,200000);
  assert.ok(booking.reference.startsWith('UZ-'));
  await assert.rejects(rpc('reserve_seats',[event,[seats[2],seats[2]]]),/Takroriy/);
  await asUser(bob);
  await assert.rejects(rpc('reserve_seats',[event,[seats[0],seats[2]]]),/band/);
  assert.equal((await db.query('select * from public.bookings where id=$1',[booking.id])).rows.length,0);
  const map=await rpc('get_event_seats',[event]);
  // Set-returning RPC is checked through SQL below; result only contains public fields.
  assert.ok(map);
  await owner();
  assert.equal((await db.query('select count(*)::int as n from public.booking_seats where seat_id=$1 and released_at is null',[seats[2]])).rows[0].n,0);
  await db.query('update public.seats set price=900000 where id=$1',[seats[0]]);
  assert.equal(Number((await db.query('select total from public.bookings where id=$1',[booking.id])).rows[0].total),200000);
  const other=(await db.query('insert into public.bookings(user_id,event_id,total) values($1,$2,1) returning id',[bob,event])).rows[0].id;
  await assert.rejects(db.query('insert into public.booking_seats(booking_id,event_id,seat_id,price) values($1,$2,$3,1)',[other,event,seats[0]]),/one_active_claim_per_seat/i);
});
test('cash confirmation is admin only, idempotent, and QR consumption happens once',async()=>{
  await asUser(alice);
  const booking=await rpc('reserve_seats',[event,[seats[3]]]);
  await assert.rejects(rpc('confirm_cash_payment',[booking.id]),/Admin/);
  await asUser(admin);
  assert.equal((await rpc('confirm_cash_payment',[booking.id])).status,'paid');
  assert.equal((await rpc('confirm_cash_payment',[booking.id])).already_confirmed,true);
  const tickets=(await db.query('select * from public.tickets where booking_id=$1',[booking.id])).rows;
  assert.equal(tickets.length,1);
  assert.equal(tickets[0].qr_token.length,64);
  await asUser(bob);
  assert.equal((await db.query('select * from public.tickets where booking_id=$1',[booking.id])).rows.length,0);
  await assert.rejects(rpc('verify_ticket',[tickets[0].qr_token,true]),/Admin/);
  await asUser(admin);
  assert.equal((await rpc('verify_ticket',[tickets[0].qr_token,false])).status,'valid');
  assert.equal((await rpc('verify_ticket',[tickets[0].qr_token,true])).status,'valid');
  assert.equal((await rpc('verify_ticket',[tickets[0].qr_token,true])).status,'used');
  assert.equal((await rpc('verify_ticket',['f'.repeat(64),true])).status,'invalid');
});
test('expired holds release seats and cannot be paid; cancellation releases active claim',async()=>{
  await asUser(alice);
  const old=await rpc('reserve_seats',[event,[seats[4]]]);
  await owner();
  await db.query("update public.bookings set expires_at=now()-interval '1 minute' where id=$1",[old.id]);
  await asUser(admin);
  const confirmation=await rpc('confirm_cash_payment',[old.id]);
  assert.equal(confirmation.status,'expired');
  assert.equal((await db.query('select * from public.tickets where booking_id=$1',[old.id])).rows.length,0);
  await asUser(bob);
  const fresh=await rpc('reserve_seats',[event,[seats[4]]]);
  await asUser(alice);
  await assert.rejects(rpc('cancel_booking',[fresh.id]),/topilmadi/);
  await asUser(bob);
  assert.equal((await rpc('cancel_booking',[fresh.id])).status,'cancelled');
  const renewed=await rpc('reserve_seats',[event,[seats[4]]]);
  assert.notEqual(renewed.id,fresh.id);
});
test('anonymous users can read published seats but cannot read private tickets or reserve',async()=>{
  await asUser(null,'anon');
  const rows=(await db.query('select * from public.get_event_seats($1)',[event])).rows;
  assert.equal(rows.length,8);
  assert.deepEqual(Object.keys(rows[0]).sort(),['id','row_label','row_order','seat_number','price','category','status'].sort());
  await assert.rejects(db.query('select * from public.tickets'),/permission/i);
  await assert.rejects(rpc('reserve_seats',[event,[seats[6]]]),/permission/i);
  await assert.rejects(rpc('expire_event_reservations',[event]),/permission/i);
});

test('demo payment is owner-only, atomic, idempotent, and excluded from real revenue',async()=>{
  const customer='00000000-0000-4000-8000-000000000004';
  await owner();await db.query('insert into auth.users(id) values($1)',[customer]);
  await asUser(admin);
  const venue=(await db.query('select id from public.venues limit 1')).rows[0].id;
  const demoEvent=await rpc('create_event_with_seats',[{title:'Fictional demo',venue_id:venue,category:'concert',starts_at:'2099-12-12T19:00:00+05:00',status:'published',is_demo:true}]);
  const demoSeats=(await db.query('select id from public.seats where event_id=$1 order by seat_number',[demoEvent])).rows.map(r=>r.id);
  const before=await rpc('admin_stats');
  await asUser(customer);
  const booking=await rpc('reserve_seats',[demoEvent,[demoSeats[0]]]);
  await asUser(bob);
  await assert.rejects(rpc('pay_demo_card',[booking.id,'success']),/topilmadi/);
  await asUser(customer);
  await assert.rejects(rpc('pay_demo_card',[booking.id,'unknown']),/test kartalari/);
  assert.equal((await rpc('pay_demo_card',[booking.id,'success'])).status,'paid');
  assert.equal((await rpc('pay_demo_card',[booking.id,'success'])).already_confirmed,true);
  const tickets=(await db.query('select * from public.tickets where booking_id=$1',[booking.id])).rows;
  assert.equal(tickets.length,1);assert.equal(tickets[0].qr_token.length,64);
  const payment=(await db.query('select status,method from public.payments where booking_id=$1',[booking.id])).rows[0];
  assert.deepEqual(payment,{status:'paid',method:'demo_card'});
  await asUser(admin);const after=await rpc('admin_stats');
  assert.equal(after.revenue,before.revenue);
  assert.equal(Number(after.demo_total)-Number(before.demo_total),100000);
  await asUser(customer);
  const declined=await rpc('reserve_seats',[demoEvent,[demoSeats[1]]]);
  assert.equal((await rpc('pay_demo_card',[declined.id,'declined'])).status,'declined');
  assert.equal((await db.query('select * from public.tickets where booking_id=$1',[declined.id])).rows.length,0);
  assert.equal((await db.query('select status from public.bookings where id=$1',[declined.id])).rows[0].status,'pending');
  await rpc('cancel_booking',[declined.id]);
  const real=await rpc('reserve_seats',[event,[seats[6]]]);
  await assert.rejects(rpc('pay_demo_card',[real.id,'success']),/DEMO/);
  await rpc('cancel_booking',[real.id]);
  const expired=await rpc('reserve_seats',[demoEvent,[demoSeats[2]]]);
  await owner();await db.query("update public.bookings set expires_at=now()-interval '1 minute' where id=$1",[expired.id]);
  await asUser(customer);
  assert.equal((await rpc('pay_demo_card',[expired.id,'success'])).status,'expired');
  assert.equal((await db.query('select * from public.tickets where booking_id=$1',[expired.id])).rows.length,0);
  await asUser(null,'anon');
  await assert.rejects(rpc('pay_demo_card',[booking.id,'success']),/permission/);
});

test('cash checkout holds one hour; receipts require admin review and allow 24 hours',async()=>{
  await owner();
  for(const name of ['202611030004_checkout_points.sql','202611030005_card_receipt_review.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
  const customer='00000000-0000-4000-8000-000000000004';
  assert.equal((await db.query('select count(*)::int n from public.cash_points')).rows[0].n,30);
  assert.equal((await db.query('select count(*)::int n from public.cash_points where is_active')).rows[0].n,0);
  const point=(await db.query('select id from public.cash_points limit 1')).rows[0].id;
  await asUser(customer);
  await assert.rejects(rpc('reserve_checkout',[event,[seats[7]],'cash',point]),/Faol/);
  await asUser(admin);
  await db.query("update public.cash_points set is_demo=false,is_active=true,address='Verified test desk' where id=$1",[point]);
  await db.query("update public.payment_settings set recipient_card='4242424242424242',recipient_name='Test recipient',enabled=true where id=1");
  await asUser(customer);
  const cash=await rpc('reserve_checkout',[event,[seats[7]],'cash',point]);
  const cashSeconds=(new Date(cash.expires_at)-Date.now())/1000;assert.ok(cashSeconds>3590&&cashSeconds<=3605);
  assert.equal((await db.query('select * from public.tickets where booking_id=$1',[cash.id])).rows.length,0);
  await asUser(admin);assert.equal((await rpc('confirm_cash_payment',[cash.id])).status,'paid');
  await asUser(customer);
  const card=await rpc('reserve_checkout',[event,[seats[6]],'card',null]);
  await assert.rejects(rpc('submit_card_receipt',[card.id,customer+'/'+card.id+'/missing.png',null]),/topilmadi/);
  const path=customer+'/'+card.id+'/proof.png';
  await db.query("insert into storage.objects(bucket_id,name) values('payment-receipts',$1)",[path]);
  await asUser(bob);await assert.rejects(rpc('submit_card_receipt',[card.id,path,null]),/topilmadi/);
  assert.equal((await db.query("select * from storage.objects where bucket_id='payment-receipts' and name=$1",[path])).rows.length,0);
  await asUser(customer);
  const review=await rpc('submit_card_receipt',[card.id,path,'1234']);assert.equal(review.status,'review');
  const hours=(new Date(review.expires_at)-Date.now())/3600000;assert.ok(hours>23.99&&hours<=24.01);
  assert.equal((await db.query('select * from public.tickets where booking_id=$1',[card.id])).rows.length,0);
  await assert.rejects(rpc('review_card_payment',[card.id,true,'']),/Admin/);
  await assert.rejects(rpc('cancel_booking',[card.id]),/Chek/);
  await assert.rejects(rpc('pay_demo_card',[card.id,'success']),/permission/);
  await asUser(admin);
  await assert.rejects(rpc('confirm_cash_payment',[card.id]),/Karta/);
  assert.equal((await rpc('review_card_payment',[card.id,true,'Bank transfer verified'])).status,'paid');
  assert.equal((await rpc('review_card_payment',[card.id,true,'Retry'])).already_confirmed,true);
  assert.equal((await db.query('select * from public.tickets where booking_id=$1',[card.id])).rows.length,1);
  await asUser(customer);
  const rejected=await rpc('reserve_checkout',[event,[seats[5]],'card',null]);
  const badPath=customer+'/'+rejected.id+'/proof.png';await db.query("insert into storage.objects(bucket_id,name) values('payment-receipts',$1)",[badPath]);
  await rpc('submit_card_receipt',[rejected.id,badPath,null]);
  await asUser(admin);assert.equal((await rpc('review_card_payment',[rejected.id,false,'No money received'])).status,'rejected');
  assert.equal((await db.query('select * from public.tickets where booking_id=$1',[rejected.id])).rows.length,0);
  await asUser(customer);
  const expired=await rpc('reserve_checkout',[event,[seats[5]],'card',null]);
  const expPath=customer+'/'+expired.id+'/proof.png';await db.query("insert into storage.objects(bucket_id,name) values('payment-receipts',$1)",[expPath]);await rpc('submit_card_receipt',[expired.id,expPath,null]);
  await owner();await db.query("update public.bookings set expires_at=now()-interval '1 second' where id=$1",[expired.id]);
  await asUser(admin);assert.equal((await rpc('review_card_payment',[expired.id,true,'Late'])).status,'expired');
  assert.equal((await db.query('select status from public.payments where booking_id=$1',[expired.id])).rows[0].status,'expired');
});
