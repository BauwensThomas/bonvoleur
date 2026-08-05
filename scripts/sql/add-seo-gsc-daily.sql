-- Migration : table seo_gsc_daily (historique Search Console, une ligne par
-- site/date/page/query - id deterministe pour permettre l'upsert, voir
-- src/lib/db.ts::upsertMany). A executer une fois dans le SQL Editor de
-- Supabase (ou via l'API Management), puis relancer rls-lockdown.sql.

CREATE TABLE IF NOT EXISTS seo_gsc_daily (
  id text PRIMARY KEY,
  site text NOT NULL,
  date date NOT NULL,
  page text NOT NULL,
  query text NOT NULL,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  position numeric NOT NULL DEFAULT 0,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_gsc_daily_site_date_idx ON seo_gsc_daily (site, date);
CREATE INDEX IF NOT EXISTS seo_gsc_daily_page_idx ON seo_gsc_daily (page);
