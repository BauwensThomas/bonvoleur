-- Migration : table seo_suggestions (propositions de correction generees par
-- l'agent seo-suggester a partir des opportunites detectees dans
-- seo_gsc_daily - voir SEO-AUTOMATION.md). Rien n'est jamais applique sans
-- passer par le statut 'approved'.

CREATE TABLE IF NOT EXISTS seo_suggestions (
  id text PRIMARY KEY,
  page text NOT NULL,
  suggestion_type text NOT NULL, -- 'title' | 'meta_description' | 'internal_links' | 'content'
  current_value text,
  proposed_value text NOT NULL,
  reason text, -- pourquoi cette proposition (metriques/contexte, pour la review humaine)
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_suggestions_status_idx ON seo_suggestions (status);
CREATE INDEX IF NOT EXISTS seo_suggestions_page_idx ON seo_suggestions (page);
