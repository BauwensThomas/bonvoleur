// Compteur de requetes par route/jour (diagnostic egress Supabase,
// 2026-08-21) - une ligne par route par jour, incrementee atomiquement
// (increment_request_count, scripts/sql/add-request-counts.sql). Jamais
// bloquant : appelee en fire-and-forget, une erreur ici ne doit jamais
// faire echouer la vraie requete.
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_sb) _sb = createClient(url, key, { auth: { persistSession: false } });
  return _sb;
}

export function trackMobileRequest(route: string): void {
  const client = sb();
  if (!client) return;
  const day = new Date().toISOString().slice(0, 10);
  client.rpc("increment_request_count", { p_route: route, p_day: day }).then(() => {});
}
