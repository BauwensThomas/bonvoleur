import { supabase } from "./supabase";

export const API_BASE = "https://www.bonvoleur.com";

// Fetch vers l'API mobile du site, avec le jeton Supabase de la session en
// cours (Authorization: Bearer ...) - equivalent du cookie web pour
// src/lib/mobile-auth.ts cote serveur.
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
