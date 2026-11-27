-- Infos pratiques verifiees par destination (trajet aeroport -> centre-ville).
-- Table separee des fiches `routes` (une ligne par DESTINATION, pas par route) :
-- chaque fait porte sa date de verification et sa source officielle.
-- Alimentee par scripts/generate-destination-facts.mjs (Claude + recherche web,
-- sources officielles obligatoires) ; une destination sans ligne = aucune section.

CREATE TABLE IF NOT EXISTS destination_facts (
  slug text PRIMARY KEY,               -- slug de la fiche destination (ex. "lisbonne")
  id text GENERATED ALWAYS AS (slug) STORED, -- alias : le code generique attend un `id`
  city text NOT NULL,
  airport_name text,                   -- aeroport principal desservi
  transfer_mode text,                  -- ex. "métro", "train", "bus", "navette"
  transfer_min integer,                -- minutes, bas de la fourchette
  transfer_max integer,                -- minutes, haut de la fourchette
  transfer_to text,                    -- point d'arrivee en ville
  transfer_summary text,               -- 1 a 2 phrases en francais
  source_url text,                     -- page officielle (operateur, aeroport, ville)
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
