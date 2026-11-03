-- Fictional demonstration data only. Safe to re-run. No admin credentials.
begin;
insert into public.venues(id,name,city,address,type,image_url,layout) values
 ('10000000-0000-4000-8000-000000000001','Humo Arena','Toshkent','Afrosiyob ko‘chasi, Toshkent','arena','https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=900&auto=format&fit=crop&q=85','[]'),
 ('10000000-0000-4000-8000-000000000002','Bunyodkor stadioni','Toshkent','Bunyodkor shohko‘chasi, Toshkent','stadium','https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=900&auto=format&fit=crop&q=85','[]'),
 ('10000000-0000-4000-8000-000000000003','O‘zbek Milliy teatri','Toshkent','Alisher Navoiy ko‘chasi, Toshkent','theatre','https://images.unsplash.com/photo-1503095396549-807759245b35?w=900&auto=format&fit=crop&q=85','[]'),
 ('10000000-0000-4000-8000-000000000004','Toshkent konsert zali','Toshkent','Toshkent shahri','hall','https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&auto=format&fit=crop&q=85','[]')
on conflict(id) do nothing;
update public.venues set layout=(select jsonb_agg(jsonb_build_object('label',r::text,'count',12,'price',case when r=1 then 500000 when r=2 then 450000 when r=3 then 400000 when r=4 then 350000 when r=5 then 300000 when r<=10 then 200000 else 100000 end,'category',case when r<=2 then 'VIP' else 'Standard' end) order by r) from generate_series(1,20) r)
where id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004') and layout='[]'::jsonb;
insert into public.events(id,venue_id,title,description,category,starts_at,status,is_demo,featured,poster_url) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Musiqa bilan birga yashang','DEMO: Concert 2026 — namoyish uchun yaratilgan xayoliy tadbir. Rasmiy e’lon emas.','concert','2026-12-12T19:00:00+05:00','published',true,true,'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1400&auto=format&fit=crop&q=90'),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Katta futbol oqshomi','DEMO: Bunyodkor stadionidagi xayoliy futbol uchrashuvi. Rasmiy jadval emas.','sport','2026-12-14T18:00:00+05:00','published',true,false,'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=85'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','Sahna sehriga sayohat','DEMO: Namuna teatr tomoshasi. Rasmiy e’lon emas.','theatre','2026-12-16T19:00:00+05:00','published',true,false,'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=85'),
 ('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','Stand Up: kulgi kechasi','DEMO: Xayoliy stand-up dasturi. Rasmiy e’lon emas.','comedy','2026-12-18T19:00:00+05:00','published',true,false,'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&auto=format&fit=crop&q=85'),
 ('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','Music Festival 2026','DEMO: Namuna musiqa festivali. Rasmiy e’lon emas.','festival','2026-12-20T17:00:00+05:00','published',true,false,'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900&auto=format&fit=crop&q=85') on conflict(id) do nothing;
insert into public.seats(event_id,row_label,row_order,seat_number,price,category)
select e.id,r::text,r,n,case when r=1 then 500000 when r=2 then 450000 when r=3 then 400000 when r=4 then 350000 when r=5 then 300000 when r<=10 then 200000 else 100000 end,case when r<=2 then 'VIP' else 'Standard' end
from public.events e cross join generate_series(1,20) r cross join generate_series(1,12) n
where e.id in ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000005')
on conflict(event_id,row_label,seat_number) do nothing;
commit;
