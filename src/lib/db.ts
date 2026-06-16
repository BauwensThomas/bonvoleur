// Couche d'accès données.
// Si SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY sont définis => Supabase (Postgres).
// Sinon => repli sur des fichiers JSON locaux sous /data (Phase 0).
// Les signatures et types restent identiques : le reste de l'app ne change pas.

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Tables, TableName } from "./types";

// --- Client Supabase (lazy : pas de connexion à l'import, donc build OK) ---
let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null; // pas configuré -> repli local
  if (!_sb) {
    _sb = createClient(url, key, { auth: { persistSession: false } });
  }
  return _sb;
}

// --- Repli local (fichiers JSON) ---
const DATA_DIR = path.join(process.cwd(), "data");

async function fileFor(table: TableName): Promise<string> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  return path.join(DATA_DIR, `${table}.json`);
}

async function readRaw<T>(table: TableName): Promise<T[]> {
  const file = await fileFor(table);
  try {
    const raw = await fs.readFile(file, "utf-8");
    const content = raw.replace(/^﻿/, "").trim(); // retire BOM éventuel
    if (content === "") return [];
    return JSON.parse(content) as T[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeRaw<T>(table: TableName, rows: T[]): Promise<void> {
  const file = await fileFor(table);
  await fs.writeFile(file, JSON.stringify(rows, null, 2), "utf-8");
}

// --- API publique (identique en local et Supabase) ---

export async function getAll<T extends TableName>(
  table: T
): Promise<Tables[T][]> {
  const client = sb();
  if (!client) return readRaw<Tables[T]>(table);
  const { data, error } = await client.from(table).select("*");
  if (error) throw new Error(`Supabase getAll(${table}): ${error.message}`);
  return (data ?? []) as Tables[T][];
}

export async function getById<T extends TableName>(
  table: T,
  id: string
): Promise<Tables[T] | null> {
  const client = sb();
  if (!client) {
    const rows = await readRaw<Tables[T]>(table);
    return rows.find((r) => (r as { id: string }).id === id) ?? null;
  }
  const { data, error } = await client
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

  const client = sb();
  if (!client) {
    const rows = await readRaw<Tables[T]>(table);
    rows.push(row);
    await writeRaw(table, rows);
    return row;
  }
  const { data: inserted, error } = await client
    .from(table)
    .insert(row as never)
    .select()
    .single();
  if (error) throw new Error(`Supabase insert(${table}): ${error.message}`);
  return inserted as Tables[T];
}

export async function update<T extends TableName>(
  table: T,
  id: string,
  patch: Partial<Tables[T]>
): Promise<Tables[T] | null> {
  const client = sb();
  if (!client) {
    const rows = await readRaw<Tables[T]>(table);
    const idx = rows.findIndex((r) => (r as { id: string }).id === id);
    if (idx === -1) return null;
    rows[idx] = { ...rows[idx], ...patch };
    await writeRaw(table, rows);
    return rows[idx];
  }
  const { data, error } = await client
    .from(table)
    .update(patch as never)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new Error(`Supabase update(${table}): ${error.message}`);
  return (data as Tables[T]) ?? null;
}

export async function remove<T extends TableName>(
  table: T,
  id: string
): Promise<boolean> {
  const client = sb();
  if (!client) {
    const rows = await readRaw<Tables[T]>(table);
    const next = rows.filter((r) => (r as { id: string }).id !== id);
    if (next.length === rows.length) return false;
    await writeRaw(table, next);
    return true;
  }
  const { error, count } = await client
    .from(table)
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error(`Supabase remove(${table}): ${error.message}`);
  return (count ?? 0) > 0;
}
