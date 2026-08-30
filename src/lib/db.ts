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

// Pagine par blocs de 1000 : Supabase plafonne chaque requête à son "Max Rows"
// (1000 par défaut) côté serveur, quel que soit le .limit() demandé côté client.
// Sans pagination, getAll("deals") ne renvoie qu'une tranche arbitraire (pas
// forcément la plus récente) une fois la table au-delà de 1000 lignes.
export async function getAll<T extends TableName>(
  table: T,
  selectCols = "*",
  options: { limit?: number; offset?: number } = {}
): Promise<Tables[T][]> {
  const limit = options.limit;
  if (typeof limit === "number") {
    const offset = options.offset ?? 0;
    const { data, error } = await sb()
      .from(table)
      .select(selectCols)
      .range(offset, offset + limit - 1);
    if (error) throw new Error(`Supabase getAll(${table}): ${error.message}`);
    return (data ?? []) as unknown as Tables[T][];
  }

  const pageSize = 1000;
  const all: Tables[T][] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb()
      .from(table)
      .select(selectCols)
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Supabase getAll(${table}): ${error.message}`);
    if (!data?.length) break;
    all.push(...(data as unknown as Tables[T][]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

// Deals récents uniquement (is_hot != false + created_at dans la fenêtre).
// Évite de charger les 1800+ deals historiques pour des calculs sur 5-7 jours.
export async function getRecentDeals(days: number): Promise<Tables["deals"][]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb()
    .from("deals")
    .select("*")
    .neq("is_hot", false)
    .gte("created_at", since);
  if (error) throw new Error(`Supabase getRecentDeals: ${error.message}`);
  return (data ?? []) as Tables["deals"][];
}

// Signal public "y a-t-il un deal frais" (app mobile : listes destinations,
// popular, weekCount) - ne sert jamais a afficher un deal individuel, juste a
// calculer origin/destination/is_hot/dates/published_at/created_at. Query
// etroite (colonnes + fenetre de fraicheur) au lieu de getAll("deals") en
// entier : la table a grossi au point que le JSON complet (6800+ lignes,
// toutes colonnes) depassait la limite de 2 Mo par entree du cache de
// donnees Next.js (unstable_cache), faisant echouer /api/mobile/destinations
// en silence (voir memoire project_conventions_techniques, 2026-08-27).
// Meme regle de fraicheur que "verite premium" (published_at ?? created_at)
// mais evaluee cote SQL plutot que redupliquee en JS. Pagine reellement
// (comme getAll()) : sans ca, la fenetre de 5 jours (1300+ lignes en
// pratique) se ferait quand meme tronquer au plafond serveur Supabase de
// 1000 lignes - constate en verifiant ce fix (1333 lignes reelles, requete
// simple n'en renvoyait que 1000).
export async function getPublicFreshDeals(
  days: number
): Promise<Pick<Tables["deals"], "origin" | "destination" | "price" | "is_hot" | "published_at" | "created_at" | "dates">[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const pageSize = 1000;
  type Row = Pick<Tables["deals"], "origin" | "destination" | "price" | "is_hot" | "published_at" | "created_at" | "dates">;
  const all: Row[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb()
      .from("deals")
      .select("origin,destination,price,is_hot,published_at,created_at,dates")
      .or(`published_at.gte.${since},and(published_at.is.null,created_at.gte.${since})`)
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`Supabase getPublicFreshDeals: ${error.message}`);
    if (!data?.length) break;
    all.push(...(data as Row[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

export async function getById<T extends TableName>(
  table: T,
  id: string,
  selectCols = "*"
): Promise<Tables[T] | null> {
  const { data, error } = await sb()
    .from(table)
    .select(selectCols)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Supabase getById(${table}): ${error.message}`);
  return (data as unknown as Tables[T]) ?? null;
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

// Upsert en masse : insère ou met à jour selon `id`. Contrairement à
// insertMany (id aléatoire généré ici), l'appelant fournit un id déterministe
// - indispensable pour les tables ré-ingérées périodiquement où l'on veut
// mettre à jour la même ligne plutôt que la dupliquer (ex. données GSC : les
// derniers jours sont révisés par Google à chaque run).
export async function upsertMany<T extends TableName>(
  table: T,
  rows: Tables[T][]
): Promise<void> {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb()
      .from(table)
      .upsert(rows.slice(i, i + 500) as never, { onConflict: "id" });
    if (error) throw new Error(`Supabase upsertMany(${table}): ${error.message}`);
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
