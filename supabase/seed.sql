/*
 * seed.sql — CHOQUE launch content (DEMO DATA — strip before real launch).
 *
 * Launch cities chosen: Portland OR · Austin TX · Brooklyn NY.
 * All gyms use ids in the 00000000-0000-4xxx-8000-xxxxxxxxxxxx range and the
 * slugs below, so the strip block at the bottom removes every seed row
 * cleanly. Cover images are hot-linked Pexels CDN photos for the demo; the
 * app re-uploads to Supabase Storage in production.
 *
 * Styles are reference data (seeded in 00001) and are NOT stripped.
 */

begin;

-- ——— Portland, OR ———
insert into public.gyms (id, slug, name, description, address, city, neighborhood, region, lat, lng, website, instagram, visitor_info, drop_in_fee_text, schedule, cover_image, status) values
('00000000-0000-4001-8000-000000000001','flatline-bjj','Flatline BJJ','Heavylegs-style pressure passing and leglock-literate no-gi in inner SE. The 6 am crew is legendary.','2218 SE Ankeny St','Portland','Buckman','OR',45.5231,-122.6408,'https://flatlinebjj.example.com','flatlinebjj','Visitors welcome any class. Flip-flops off the mat, gi — any color.',' $25 drop-in · free first week for travelers','[{"day":"Mon","time":"06:00","label":"Gi early birds"},{"day":"Wed","time":"18:30","label":"No-gi all levels"},{"day":"Sat","time":"13:00","label":"Open mat"}]','https://images.pexels.com/photos/38678683/pexels-photo-38678683.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000002','stumptown-judo','Stumptown Judo','Community judo club running since 1985. Technical randori-first with monthly kata clinics.','4512 NE Sandy Blvd','Portland','Hollywood','OR',45.5329,-122.6122,null,'stumptownjudo','Beginner course starts the first Tuesday of the month. Judogi rental $5.','$15 drop-in','[{"day":"Mon","time":"18:30","label":"Technical randori"},{"day":"Sat","time":"12:00","label":"Open randori"}]','https://images.pexels.com/photos/6765107/pexels-photo-6765107.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000003','wake-and-grapple','Wake & Grapple','Morning-first academy: 6 am classes seven days a week, yoga on Sundays.','810 SE Belmont St','Portland','Sunnyside','OR',45.5166,-122.6571,null,null,'No visitors without a booked guest pass.',' $30 day pass','[{"day":"Tue","time":"06:00","label":"Competition class"},{"day":"Fri","time":"06:00","label":"Shark tank"}]','https://images.pexels.com/photos/8612032/pexels-photo-8612032.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000004','rose-city-wrestling','Rose City Wrestling','Folkstyle and freestyle for adults; two rooms, 2,400 sq ft of fresh mats. Speed day Wednesdays.','7020 N Lombard St','Portland','Cathedral Park','OR',45.5872,-122.7540,null,null,'Wrestling shoes only. Beginners always - we partner lightly.','$20 open-room fee','[{"day":"Wed","time":"18:00","label":"Speed + live goes"},{"day":"Sun","time":"09:30","label":"Open room"}]','https://images.pexels.com/photos/8611380/pexels-photo-8611380.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000005','montavilla-mma','Montavilla MMA','Small-class MMA with a cage wall and a coaching staff that corners active pro fighters.','7834 SE Stark St','Portland','Montavilla','OR',45.5192,-122.5905,null,'montavillamma','First week free for locals. Mouthguard required for sparring.','$25 drop-in','[{"day":"Mon","time":"18:00","label":"MMA fundamentals"},{"day":"Sat","time":"12:00","label":"Open mat"}]','https://images.pexels.com/photos/38758877/pexels-photo-38758877.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published');

-- ——— Austin, TX ———
insert into public.gyms (id, slug, name, description, address, city, neighborhood, region, lat, lng, website, instagram, visitor_info, drop_in_fee_text, schedule, cover_image, status) values
('00000000-0000-4001-8000-000000000006','cinder-combat-club','Cinder Combat Club','East Austin''s quiet MMA room. Small classes, pads and cage wall in the back, beginner lane always.','507 Calles St','Austin','East Cesar Chavez','TX',30.2596,-97.7245,'https://cindercombat.example.com','cindercombat','Park on Robert Martinez Jr St. Beginner lane never phased out.','$30 drop-in · first week free','[{"day":"Mon","time":"18:00","label":"MMA fundamentals"},{"day":"Thu","time":"18:00","label":"No-gi grappling"},{"day":"Sat","time":"12:00","label":"Open mat"}]','https://images.pexels.com/photos/38758877/pexels-photo-38758877.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000007','barton-springs-bjj','Barton Springs BJJ','Gi-heavy fundamentals academy two blocks from the springs. Chill room, strong guard players.','2124 S Lamar Blvd','Austin','Zilker','TX',30.2632,-97.7700,null,'bartonspringsbjj','Loaner gis for travelers. Children''s class separate room.','$25 drop-in','[{"day":"Tue","time":"07:00","label":"Gi all levels"},{"day":"Sat","time":"10:00","label":"Open mat"}]','https://images.pexels.com/photos/20182272/pexels-photo-20182272.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000008','muay-thai-corner-east','Muay Thai Corner East','Clinch-heavy Thai rounds in an East side warehouse. Conditioning at dawn, technical sparring in the evening.','2911 E 5th St','Austin','East Sixth','TX',30.2530,-97.7040,null,null,'16-bag line. Hand wraps + shin guards for sparring.','$20 drop-in','[{"day":"Wed","time":"18:30","label":"Technical sparring"},{"day":"Sun","time":"10:30","label":"Open mat + pads"}]','https://images.pexels.com/photos/39969614/pexels-photo-39969614.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000009','live-oak-judo-kai','Live Oak Judo-kai','Judo for the whole family. Sprung floors over tatami frames, heavy on ne-waza in the second hour.','1306 Manor Rd','Austin','Cherrywood','TX',30.2888,-97.7145,null,null,'Free visitor week for Texas Judo members.','$15 drop-in','[{"day":"Mon","time":"18:30","label":"Technical randori"},{"day":"Sat","time":"12:00","label":"Open randori"}]','https://images.pexels.com/photos/6765108/pexels-photo-6765108.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000010','south-congress-boxing','South Congress Boxing','Defense-first boxing curriculum, mitt work every session, monthly smoker series.','2308 S Congress Ave','Austin','South Congress','TX',30.2450,-97.7490,null,null,'Wraps + gloves required. Beginners mitt-work only first month.','$20 drop-in','[{"day":"Tue","time":"18:00","label":"Fighter''s hour"},{"day":"Sat","time":"09:00","label":"Open ring"}]','https://images.pexels.com/photos/11392385/pexels-photo-11392385.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published');

-- ——— Brooklyn, NY ———
insert into public.gyms (id, slug, name, description, address, city, neighborhood, region, lat, lng, website, instagram, visitor_info, drop_in_fee_text, schedule, cover_image, status) values
('00000000-0000-4001-8000-000000000011','anchor-and-arm','Anchor & Arm','Throws on Tuesdays, guard on Thursdays. A judo-first room in Williamsburg where BJJ folks fix their stand-up.','550 Grand St','Brooklyn','Williamsburg','NY',40.7143,-73.9582,'https://anchorandarm.example.com','anchorandarm','Visitors — email before your first class. Gi any color.','$35 drop-in','$35 drop-in','[{"day":"Tue","time":"19:00","label":"Judo + tachi-waza"},{"day":"Thu","time":"19:00","label":"BJJ all levels"},{"day":"Sun","time":"11:00","label":"Open mat"}]','https://images.pexels.com/photos/8612046/pexels-photo-8612046.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000012','greenpoint-no-gi-club','Greenpoint No-Gi Club','Leglock-literate no-gi collective. 90-minute rounds nights, open drilling mezzanine.','704 Manhattan Ave','Brooklyn','Greenpoint','NY',40.7250,-73.9498,null,null,'Rashguard and shorts with no pockets. Women''s class Sundays.','$25 drop-in','[{"day":"Wed","time":"18:30","label":"No-gi all levels"},{"day":"Sat","time":"13:00","label":"Open mat"}]','https://images.pexels.com/photos/38678637/pexels-photo-38678637.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000013','fort-greene-boxing','Fort Greene Boxing','Old walls, new ideas. Two rings, ten-bag line, Golden Gloves pipeline.','690 Fulton St','Brooklyn','Fort Greene','NY',40.6895,-73.9740,null,'fortgreeneboxing','First-timers — 15 min early for wraps.','$25 day pass','[{"day":"Tue","time":"18:00","label":"Fighter''s hour"},{"day":"Sat","time":"09:00","label":"Open ring + bags"}]','https://images.pexels.com/photos/11392385/pexels-photo-11392385.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000014','bushwick-wrestling-lab','Bushwick Wrestling Lab','Adult folkstyle and folkstyle-to-grappling crossover clinic. Live goes every session.','670 Flushing Ave','Brooklyn','Bushwick','NY',40.7010,-73.9335,null,null,'Wrestling shoes only on the mat.','$20 room fee','[{"day":"Thu","time":"18:30","label":"Folkstyle + live goes"},{"day":"Sun","time":"09:30","label":"Open room"}]','https://images.pexels.com/photos/6765026/pexels-photo-6765026.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published'),
('00000000-0000-4001-8000-000000000015','downtown-mma','Downtown MMA','Striking rounds Monday, wall-and-cage wrestling Wednesday, fight team Fridays.','151 Smith St','Brooklyn','Downtown Brooklyn','NY',40.6870,-73.9890,null,null,'Sparring only with coach sign-off.','$30 drop-in','[{"day":"Mon","time":"18:00","label":"Kickboxing rounds"},{"day":"Wed","time":"18:00","label":"Wall + cage wrestling"},{"day":"Sat","time":"10:00","label":"Open mat"}]','https://images.pexels.com/photos/23531700/pexels-photo-23531700.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200','published');

-- ——— Gym ↔ style links ———
insert into public.gym_styles (gym_id, style_id)
select g.id, s.id from (values
  ('flatline-bjj','bjj-gi'), ('flatline-bjj','bjj-nogi'),
  ('stumptown-judo','judo'),
  ('wake-and-grapple','bjj-gi'),
  ('rose-city-wrestling','wrestling'),
  ('montavilla-mma','mma'), ('montavilla-mma','bjj-nogi'),
  ('cinder-combat-club','mma'), ('cinder-combat-club','bjj-nogi'), ('cinder-combat-club','bjj-gi'),
  ('barton-springs-bjj','bjj-gi'),
  ('muay-thai-corner-east','muay-thai'),
  ('live-oak-judo-kai','judo'),
  ('south-congress-boxing','boxing'),
  ('anchor-and-arm','judo'), ('anchor-and-arm','bjj-gi'), ('anchor-and-arm','wrestling'),
  ('greenpoint-no-gi-club','bjj-nogi'),
  ('fort-greene-boxing','boxing'),
  ('bushwick-wrestling-lab','wrestling'),
  ('downtown-mma','mma'), ('downtown-mma','muay-thai')
) as x(gym_slug, style_slug)
join public.gyms g on g.slug = x.gym_slug
join public.styles s on s.slug = x.style_slug
on conflict do nothing;

-- ——— Open mats (10) — all land on Saturday (day_of_week = 6) ———
insert into public.open_mats (id, gym_id, title, host_name, host_contact, city, neighborhood, address, day_of_week, start_time, end_time, recurrence, style_id, visitor_requirements, cost_text, notes, status)
select
  ('00000000-0000-4001-9000-0000000000' || m.ord_text)::uuid,
  g.id, m.title, m.host_name, m.host_contact, g.city, g.neighborhood, g.address,
  6, m.start_t::time, m.end_t::time, m.recurrence,
  (select id from public.styles where slug = m.style_slug),
  m.visitor_req, m.cost_text, m.notes, 'published'
from (values
  ('01', 'flatline-bjj',        'No-gi Saturday',            'Bea Fontoura',  'frontdesk@flatlinebjj.example.com','13:00','15:00','weekly','bjj-nogi','Heel hooks only with partner consent','$15','Leglock-friendly room. Heel hooks only if both partners agree pre-round.'),
  ('02', 'stumptown-judo',      'Saturday open randori',     'Akira Onishi',  'hello@stumptownjudo.example.com','12:00','14:00','weekly','judo','Judogi, any color','$10','Standing and ne-waza rounds. Nage-komi mats open the second hour.'),
  ('03', 'rose-city-wrestling', 'Sunday wrestling room',     'Dan Petrosyan', 'coach@rosecitywrestling.example.com','09:30','11:30','weekly','wrestling','Wrestling shoes required','$10','Live goes by weight class, drilling stations on the second mat.'),
  ('04', 'cinder-combat-club',  'MMA open mat',              'Val Ospina',    'mat@cindercombat.example.com','12:00','14:00','weekly','mma','4oz gloves + shin guards for sparring','$20','Cage wall reserved on the hour. Sparring with coach sign-off only.'),
  ('05', 'barton-springs-bjj',  'Saturday gi open mat',      'Renan Vasconcelos','rolls@bartonspringsbjj.example.com','10:00','12:00','weekly','bjj-gi','Loaner gis available','$15','Rounds 7 minutes, last 30 min is no-points flow.'),
  ('06', 'muay-thai-corner-east','Sunday open mat + pads',   'Kwan Sitmonchai','gym@muaythaicorner.example.com','10:30','12:30','weekly','muay-thai','Wraps mandatory, guards for sparring','$20','Rings and bag line open. Light technical sparring only.'),
  ('07', 'anchor-and-arm',      'Sunday scramble',           'Levan Kiknadze','front@anchorandarm.example.com','11:00','13:00','weekly','bjj-gi','Email before first visit','$25','Gi in the big room, no-gi on the flexi-roll. Grip-fighting circle at 12:30.'),
  ('08', 'greenpoint-no-gi-club','No-gi open drilling',      'Hana Sato',     'train@greenpointnogi.example.com','13:00','15:00','weekly','bjj-nogi','Rashguard, no pockets','$15','Drilling stations first two hours, light rolling the last.'),
  ('09', 'fort-greene-boxing',  'Open ring + bags',          'Eddie Kaczmarek','ring@fortgreeneboxing.example.com','09:00','11:00','weekly','boxing','Wraps + gloves','$15','Two rings on rotation, coaches hold mitts by request.'),
  ('10', 'downtown-mma',        'MMA + striking open mat',   'Mei Chen',      'sparr@downtownmma.example.com','10:00','12:00','weekly','mma','Coach sign-off for sparring','$20','Wall rounds and pad stations.')
) as m(ord_text, gym_slug, title, host_name, host_contact, start_t, end_t, recurrence, style_slug, visitor_req, cost_text, notes)
join public.gyms g on g.slug = m.gym_slug
on conflict (id) do nothing;

commit;

/*
 * STRIP BEFORE REAL LAUNCH (run the block below):
 *
 * begin;
 * delete from public.note_collections where true;            -- none in seed
 * delete from public.note_links where true;                  -- none in seed
 * delete from public.notes where true;                       -- none in seed
 * delete from public.collections where true;                 -- none in seed
 * delete from public.open_mats where id::text like '00000000-0000-4%';
 * delete from public.gym_styles where gym_id in (select id from public.gyms where id::text like '00000000-0000-4%');
 * delete from public.gyms where id::text like '00000000-0000-4%';
 * -- styles are reference data and stay.
 * commit;
 */
