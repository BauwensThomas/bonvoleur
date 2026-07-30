-- Migration : table push_sends (anti-doublon dedie aux notifications push,
-- separe de `sends` qui sert uniquement a l'email). Cadence du push decouplee
-- de l'email (a chaque scan, jusqu'a 3x/jour) - voir src/lib/push-send.ts.
-- A executer une fois dans le SQL Editor de Supabase, puis relancer
-- rls-lockdown.sql pour verrouiller cette nouvelle table aussi.

-- Memes types que `sends` (text, pas de FK - ids generes cote app via
-- randomUUID(), aucune contrainte de cle etrangere sur cette table non plus).
CREATE TABLE IF NOT EXISTS push_sends (
  id text PRIMARY KEY,
  deal_id text NOT NULL,
  subscriber_id text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_sends_dedup_idx ON push_sends (deal_id, subscriber_id);
