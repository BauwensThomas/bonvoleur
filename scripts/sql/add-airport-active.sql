-- Migration : ajout colonne active sur airports + seed complet des 17 aéroports BE/FR
-- À exécuter une fois dans le SQL Editor de Supabase.

ALTER TABLE airports ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT false;

-- Seed des 17 aéroports (iata en PK unique). Active les 4 aéroports du site actuel.
INSERT INTO airports (iata, name, city, country, active) VALUES
  ('BRU', 'Brussels Airport',                     'Bruxelles',      'BE', true),
  ('CRL', 'Brussels South Charleroi Airport',      'Charleroi',      'BE', true),
  ('LGG', 'Liège Airport',                         'Liège',          'BE', false),
  ('ANR', 'Antwerp International Airport',         'Anvers',         'BE', false),
  ('OST', 'Ostend-Bruges International Airport',   'Ostende',        'BE', false),
  ('CDG', 'Paris Charles de Gaulle Airport',       'Paris CDG',      'FR', true),
  ('ORY', 'Paris Orly Airport',                    'Paris Orly',     'FR', false),
  ('BVA', 'Paris Beauvais Airport',                'Paris Beauvais', 'FR', false),
  ('LYS', 'Lyon-Saint Exupéry Airport',            'Lyon',           'FR', true),
  ('NCE', 'Nice Côte d''Azur Airport',             'Nice',           'FR', false),
  ('MRS', 'Marseille Provence Airport',            'Marseille',      'FR', false),
  ('BOD', 'Bordeaux-Mérignac Airport',             'Bordeaux',       'FR', false),
  ('TLS', 'Toulouse-Blagnac Airport',              'Toulouse',       'FR', false),
  ('NTE', 'Nantes Atlantique Airport',             'Nantes',         'FR', false),
  ('LIL', 'Lille Airport',                         'Lille',          'FR', false),
  ('MPL', 'Montpellier Mediterranean Airport',     'Montpellier',    'FR', false),
  ('SXB', 'Strasbourg Airport',                    'Strasbourg',     'FR', false)
ON CONFLICT (iata) DO UPDATE
  SET name = EXCLUDED.name,
      city = EXCLUDED.city,
      country = EXCLUDED.country,
      active = CASE
        WHEN airports.active = true THEN true  -- ne jamais désactiver un aéroport déjà actif
        ELSE EXCLUDED.active
      END;
