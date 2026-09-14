-- Cloud `db push` applies migrations but does not run seed.sql. Keep the
-- minimum editorial categories available without copying demo content.
insert into public.skill_categories
  (id, slug, name, description, sort_order, status, published_at)
select defaults.id, defaults.slug, defaults.name, defaults.description,
       defaults.sort_order, 'published'::public.content_status, now()
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'ball-handling', '運球與控球', '建立變向、節奏與護球能力。', 10),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'shooting', '投籃', '練習出手腳步與投籃。', 20),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'finishing', '籃下終結', '建立各角度的籃下終結能力。', 30),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'footwork', '腳步與中距離', '練習軸心腳、背框腳步與急停。', 40),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'playmaking', '擋拆與組織', '練習掩護後的閱讀與決策。', 50)
) as defaults(id, slug, name, description, sort_order)
where not exists (
  select 1 from public.skill_categories existing where existing.slug = defaults.slug
)
on conflict (id) do nothing;
