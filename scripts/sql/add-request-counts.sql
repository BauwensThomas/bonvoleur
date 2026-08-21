-- Migration : compteur de requetes par route/jour (diagnostic egress
-- Supabase, 2026-08-21) - une seule ligne par route par jour (pas une ligne
-- par requete), incremente via UPSERT atomique. Voir src/lib/request-track.ts.
-- A executer une fois dans le SQL Editor de Supabase, puis relancer
-- rls-lockdown.sql pour verrouiller cette nouvelle table aussi.

CREATE TABLE IF NOT EXISTS request_counts (
  route text NOT NULL,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (route, day)
);

-- Incrément atomique (évite les pertes en cas de requêtes concurrentes,
-- contrairement à un simple upsert cote client qui écraserait la valeur).
CREATE OR REPLACE FUNCTION increment_request_count(p_route text, p_day date)
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO request_counts (route, day, count)
  VALUES (p_route, p_day, 1)
  ON CONFLICT (route, day)
  DO UPDATE SET count = request_counts.count + 1;
$$;
