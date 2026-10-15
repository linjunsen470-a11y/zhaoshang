-- Additive commercial expansion. Run with psql -v ON_ERROR_STOP=1 after an external database backup.
-- Existing IDs, lead snapshots, media and historical fields are preserved.
BEGIN;
SELECT pg_advisory_xact_lock(20260922);
CREATE SCHEMA IF NOT EXISTS commercial_backup;
CREATE TABLE IF NOT EXISTS commercial_backup.projects_20260922 AS TABLE public.projects;
CREATE TABLE IF NOT EXISTS commercial_backup.leads_20260922 AS TABLE public.leads;
DO $$ BEGIN
  CREATE TYPE public.enum_projects_listing_kind AS ENUM ('project', 'unit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.enum_projects_business_scene AS ENUM ('campus', 'community', 'tourism', 'mall');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.enum_leads_business_scene AS ENUM ('campus', 'community', 'tourism', 'mall');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS listing_kind public.enum_projects_listing_kind,
  ADD COLUMN IF NOT EXISTS business_scene public.enum_projects_business_scene,
  ADD COLUMN IF NOT EXISTS legacy_unclassified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS parent_project_id integer,
  ADD COLUMN IF NOT EXISTS venue_name varchar,
  ADD COLUMN IF NOT EXISTS unit_location varchar,
  ADD COLUMN IF NOT EXISTS area_min numeric,
  ADD COLUMN IF NOT EXISTS area_max numeric,
  ADD COLUMN IF NOT EXISTS monthly_rent_min numeric,
  ADD COLUMN IF NOT EXISTS monthly_rent_max numeric,
  ADD COLUMN IF NOT EXISTS community_info varchar,
  ADD COLUMN IF NOT EXISTS tourism_info varchar,
  ADD COLUMN IF NOT EXISTS mall_info varchar,
  ADD COLUMN IF NOT EXISTS premises_conditions varchar,
  ADD COLUMN IF NOT EXISTS introduction varchar,
  ADD COLUMN IF NOT EXISTS operating_requirements varchar;
ALTER TABLE public.projects ALTER COLUMN project_type DROP NOT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_scene public.enum_leads_business_scene;
-- Only pre-migration rows have NULL listing_kind. Never reclassify a new draft on rerun.
UPDATE public.projects SET
  business_scene = CASE WHEN project_type::text IN ('食堂档口','校园商业街','校内铺位','校外临校铺位','校园服务点') THEN 'campus'::public.enum_projects_business_scene ELSE NULL END,
  legacy_unclassified = project_type IS NULL OR project_type::text NOT IN ('食堂档口','校园商业街','校内铺位','校外临校铺位','校园服务点'),
  listing_kind = 'unit'
WHERE listing_kind IS NULL;
-- Enrich only working consultation metadata; never touch customer_snapshot.
UPDATE public.leads AS l SET business_scene = p.business_scene::text::public.enum_leads_business_scene
FROM public.projects AS p WHERE l.project_id = p.id AND l.business_scene IS NULL AND p.business_scene IS NOT NULL;
ALTER TABLE public.projects ALTER COLUMN listing_kind SET DEFAULT 'unit';
ALTER TABLE public.projects ALTER COLUMN listing_kind SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.projects ADD CONSTRAINT projects_parent_project_fk FOREIGN KEY (parent_project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS projects_parent_project_idx ON public.projects(parent_project_id);
CREATE INDEX IF NOT EXISTS projects_scene_kind_idx ON public.projects(business_scene, listing_kind);
CREATE INDEX IF NOT EXISTS projects_area_idx ON public.projects(area_min, area_max);
CREATE INDEX IF NOT EXISTS projects_monthly_rent_idx ON public.projects(monthly_rent_min, monthly_rent_max);
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '天河';
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '番禺';
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '增城';
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '白云';
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '黄埔';
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '从化';
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '越秀';
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '海珠';
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '荔湾';
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '花都';
ALTER TYPE public.enum_projects_district ADD VALUE IF NOT EXISTS '南沙';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '快餐';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '粉面';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '小吃';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '奶茶';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '咖啡';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '便利店';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '水果';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '文具';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '打印';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '快递';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '维修';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '洗衣';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '正餐';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '烘焙甜品';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '美容美发';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '服饰零售';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '宠物服务';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '儿童亲子';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '休闲娱乐';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '文创零售';
ALTER TYPE public.enum_projects_suitable_business ADD VALUE IF NOT EXISTS '其他';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '快餐';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '粉面';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '小吃';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '奶茶';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '咖啡';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '便利店';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '水果';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '文具';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '打印';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '快递';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '维修';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '洗衣';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '正餐';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '烘焙甜品';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '美容美发';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '服饰零售';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '宠物服务';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '儿童亲子';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '休闲娱乐';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '文创零售';
ALTER TYPE public.enum_projects_unsuitable_business ADD VALUE IF NOT EXISTS '其他';
COMMIT;
