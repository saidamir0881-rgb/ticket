import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('official import preserves history, blocks local inventory and serves private bearer tickets without PII',async()=>{
 const db=new PGlite();try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema storage;create schema extensions;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create function extensions.gen_random_bytes(n int) returns bytea language sql volatile as $$select decode(string_agg(md5(random()::text),''),'hex') from generate_series(1,ceil(n/16.0)::int)$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key,bucket_id text,name text);
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
 const sql=await readFile(new URL('../supabase/migrations/202611030001_uzticket.sql',import.meta.url),'utf8');await db.exec(sql.replace('create extension if not exists pgcrypto with schema extensions;',''));
 await db.exec(await readFile(new URL('../supabase/seed.sql',import.meta.url),'utf8'));
 const user=(await db.query('insert into auth.users(id) values(gen_random_uuid()) returning id')).rows[0].id;
 const seat=(await db.query('select * from public.seats limit 1')).rows[0];
 const booking=(await db.query("insert into public.bookings(user_id,event_id,status,total,expires_at) values($1,$2,'paid',100,now()) returning id",[user,seat.event_id])).rows[0].id;
 const bs=(await db.query('insert into public.booking_seats(booking_id,seat_id,event_id,price) values($1,$2,$3,100) returning id',[booking,seat.id,seat.event_id])).rows[0].id;
 const t=(await db.query('insert into public.tickets(booking_id,booking_seat_id) values($1,$2) returning *',[booking,bs])).rows[0];
 await db.exec(await readFile(new URL('../UZTICKET-official-catalog.sql',import.meta.url),'utf8'));
 assert.equal((await db.query("select count(*)::int n from public.events where inventory_mode='external'")).rows[0].n,50);
 assert.equal((await db.query("select count(*)::int n from public.events where is_demo and status='published'")).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from public.tickets')).rows[0].n,1);
 const ext=(await db.query("select id from public.events where inventory_mode='external' limit 1")).rows[0].id;
 await assert.rejects(db.query("insert into public.seats(event_id,row_label,seat_number,price) values($1,'1',1,100)",[ext]),/mahalliy/);
 await assert.rejects(db.query("insert into public.bookings(user_id,event_id,total,expires_at) values($1,$2,100,now())",[user,ext]),/mahalliy/);
 await db.exec('set role anon');
 const info=(await db.query('select public.public_ticket($1) v',[t.qr_token])).rows[0].v;
 assert.equal(info.invalid,true);assert.equal(info.ticket.qr_token,t.qr_token);assert.ok(!JSON.stringify(info).includes(user));
 assert.equal((await db.query("select public.public_ticket('wrong') v")).rows[0].v,null);
 await db.exec('reset role');assert.equal((await db.query('select used_at from public.tickets')).rows[0].used_at,null);
 await db.exec(await readFile(new URL('../UZTICKET-enable-booking.sql',import.meta.url),'utf8'));
 // Repeat application must not duplicate inventory or alter historical tickets.
 await db.exec(await readFile(new URL('../UZTICKET-enable-booking.sql',import.meta.url),'utf8'));
 const counts=(await db.query("select event_id,count(*)::int n,min(price)::int low,max(price)::int high from public.seats where event_id in(select id from public.events where source_name='iTicket.uz') group by event_id")).rows;
 assert.equal(counts.length,50);assert.ok(counts.every(r=>r.n===100&&r.low===100000&&r.high===1000000));
 assert.equal((await db.query("select price::int p from public.seats where event_id=$1 and row_label='1' and seat_number=1",[ext])).rows[0].p,1000000);
 assert.equal((await db.query("select price::int p from public.seats where event_id=$1 and row_label='10' and seat_number=10",[ext])).rows[0].p,100000);
 await db.query("update public.events set starts_at='2099-12-01' where id=$1",[ext]);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);await db.exec('set role authenticated');
 const selected=(await db.query('select id from public.seats where event_id=$1 limit 1',[ext])).rows[0].id;
 const result=(await db.query('select public.reserve_seats($1,$2::uuid[]) v',[ext,[selected]])).rows[0].v;
 assert.ok(result.id);await assert.rejects(db.query('select public.reserve_seats($1,$2::uuid[]) v',[ext,[selected]]));
 }finally{await db.close();}
});
