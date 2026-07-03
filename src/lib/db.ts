// Couche d'accès données : 100% Supabase (Postgres).
// Requiert SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Plus aucun stockage JSON local.
// Les signatures et types restent identiques : le reste de l'app ne change pas.
import "server-only";

import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Tables, TableName } from "./types";

// Client Supabase (lazy : pas de connexion à l'import, donc build OK).
let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase non configuré : définis SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local."
    );
  }
  if (!_sb) {
    _sb = createClient(url, key, { auth: { persistSession: false } });
  }
  return _sb;
}

export async function getAll<T extends TableName>(
  table: T
): Promise<Tables[T][]> {
  const { data, error } = await sb().from(table).select("*");
  if (error) throw new Error(`Supabase getAll(${table}): ${error.message}`);
  return (data ?? []) as Tables[T][];
}

export async function getById<T extends TableName>(
  table: T,
  id: string
): Promise<Tables[T] | null> {
  const { data, error } = await sb()
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Supabase getById(${table}): ${error.message}`);
  return (data as Tables[T]) ?? null;
}

// findOne garde un prédicat JS : on récupère puis on filtre côté code.
// Simple et fidèle à l'ancien comportement (volumes faibles au démarrage).
export async function findOne<T extends TableName>(
  table: T,
  predicate: (row: Tables[T]) => boolean
): Promise<Tables[T] | null> {
  const rows = await getAll(table);
  return rows.find(predicate) ?? null;
}

export async function insert<T extends TableName>(
  table: T,
  data: Omit<Tables[T], "id" | "created_at"> & Partial<Pick<Tables[T], "id">>
): Promise<Tables[T]> {
  const row = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...data,
  } as Tables[T];

  const { data: inserted, error } = await sb()
    .from(table)
    .insert(row as never)
    .select()
    .single();
  if (error) throw new Error(`Supabase insert(${table}): ${error.message}`);
  return inserted as Tables[T];
}

// Insertion en masse (1 requête par lot de 500). Pour les écritures volumineuses
// (ex. enregistrer tous les envois d'un digest) sans multiplier les requêtes.
export async function insertMany<T extends TableName>(
  table: T,
  rows: (Omit<Tables[T], "id" | "created_at"> & Partial<Pick<Tables[T], "id">>)[]
): Promise<void> {
  if (rows.length === 0) return;
  const now = new Date().toISOString();
  const prepared = rows.map((r) => ({
    id: randomUUID(),
    created_at: now,
    ...r,
  })) as Tables[T][];
  for (let i = 0; i < prepared.length; i += 500) {
    const { error } = await sb()
      .from(table)
      .insert(prepared.slice(i, i + 500) as never);
    if (error) throw new Error(`Supabase insertMany(${table}): ${error.message}`);
  }
}

export async function update<T extends TableName>(
  table: T,
  id: string,
  patch: Partial<Tables[T]>
): Promise<Tables[T] | null> {
  const { data, error } = await sb()
    .from(table)
    .update(patch as never)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new Error(`Supabase update(${table}): ${error.message}`);
  return (data as Tables[T]) ?? null;
}

export async function getRouteSlugTimestamps(): Promise<{ slug: string; updated_at: string }[]> {
  const { data, error } = await sb().from("routes").select("slug, updated_at");
  if (error) throw new Error(`Supabase getRouteSlugTimestamps: ${error.message}`);
  return (data ?? []) as { slug: string; updated_at: string }[];
}

export async function remove<T extends TableName>(
  table: T,
  id: string
): Promise<boolean> {
  const { error, count } = await sb()
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error(`Supabase remove(${table}): ${error.message}`);
  return (count ?? 0) > 0;
}
