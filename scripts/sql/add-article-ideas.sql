-- File d'attente d'idees d'articles saisies a la main dans /admin/article-ideas.
-- Le content-publisher traite en priorite l'idee 'pending' la plus ancienne.

CREATE TABLE IF NOT EXISTS article_ideas (
  id text PRIMARY KEY,
  instructions text NOT NULL,          -- consigne / prompt de l'utilisateur
  source_urls text[] NOT NULL DEFAULT '{}', -- pages lues comme inspiration (jamais copiees)
  link_url text,                       -- lien a citer DANS le texte de l'article
  link_label text,                     -- nom du site cite (ancre)
  photo_url text,                      -- photo a heberger comme couverture
  photo_credit text,                   -- credit affiche sous la photo
  review_first boolean NOT NULL DEFAULT true, -- true : brouillon a relire, rien n'est diffuse
  status text NOT NULL DEFAULT 'pending', -- pending | processing | done | skipped | error
  post_id text,
  post_slug text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS article_ideas_status_idx ON article_ideas (status, created_at);
