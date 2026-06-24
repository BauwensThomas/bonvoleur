-- Retire EXECUTE aux rôles publics sur les fonctions internes.
--
-- rls_auto_enable() est une fonction d'EVENT TRIGGER (SECURITY DEFINER) qui
-- active automatiquement la RLS sur toute nouvelle table du schéma `public`.
-- Elle est déclenchée par le système (DDL), elle n'a JAMAIS besoin d'être
-- appelable via l'API REST par `anon`/`authenticated`. On révoque donc EXECUTE
-- pour lever les warnings Advisor "(...) Can Execute SECURITY DEFINER Function".
-- L'event trigger continue de fonctionner (il ne dépend pas de ces droits).
--
-- Idempotent.  psql "$SUPABASE_DB_URL" -f scripts/sql/secure-functions.sql

revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
