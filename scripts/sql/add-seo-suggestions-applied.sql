-- Migration : trace l'application reelle d'une suggestion SEO (etape 8).
-- applied_at = null tant que rien n'a ete ecrit sur le site (statut "approved"
-- ne suffit pas a lui seul : certains types ne sont pas encore auto-applicables).
ALTER TABLE seo_suggestions ADD COLUMN IF NOT EXISTS applied_at timestamptz;
ALTER TABLE seo_suggestions ADD COLUMN IF NOT EXISTS apply_note text;
