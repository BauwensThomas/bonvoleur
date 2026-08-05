-- Migration : table seo_indexation (statut d'indexation Google par page,
-- via l'API URL Inspection - voir SEO-AUTOMATION.md). Une ligne par page,
-- id deterministe (hash de l'URL) pour permettre l'upsert (re-verification
-- periodique, jamais de doublon).

CREATE TABLE IF NOT EXISTS seo_indexation (
  id text PRIMARY KEY,
  page text NOT NULL,
  verdict text NOT NULL, -- PASS | NEUTRAL | FAIL | VERDICT_UNSPECIFIED (Google)
  coverage_state text, -- texte Google, ex "Submitted and indexed", "Discovered - currently not indexed"
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS seo_indexation_page_idx ON seo_indexation (page);
CREATE INDEX IF NOT EXISTS seo_indexation_verdict_idx ON seo_indexation (verdict);
