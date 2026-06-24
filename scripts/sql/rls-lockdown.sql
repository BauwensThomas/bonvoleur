-- Verrouillage RLS de toutes les tables `public`.
-- Contexte : l'application accède aux données UNIQUEMENT via la service role
-- (côté serveur), qui IGNORE la RLS. La clé anon (publique, navigateur) ne sert
-- qu'à l'authentification, jamais à lire les tables. On refuse donc explicitement
-- tout accès direct des rôles `anon` et `authenticated` (defense en profondeur).
--
-- Effet : lève l'info "RLS enabled, no policy" de l'Advisor Supabase, sans rien
-- changer pour l'app (le service role passe outre la RLS).
--
-- Idempotent : peut être relancé sans risque. Applique aussi aux futures tables
-- en le relançant.
--   psql "$SUPABASE_DB_URL" -f scripts/sql/rls-lockdown.sql

do $$
declare r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('drop policy if exists "server_only" on public.%I', r.tablename);
    execute format(
      'create policy "server_only" on public.%I for all to anon, authenticated using (false) with check (false)',
      r.tablename
    );
  end loop;
end $$;
