// Couche d'accès données.
// Phase 0 (local) : stockage dans des fichiers JSON sous /data.
// Phase 1 : remplacer le contenu de ce fichier par des appels Supabase,
// sans toucher au reste de l'application (mêmes signatures, mêmes types).

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { Tables, TableName } from "./types";

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
    if (content === "") return []; // fichier vide => tableau vide
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

export async function getAll<T extends TableName>(
  table: T
): Promise<Tables[T][]> {
  return readRaw<Tables[T]>(table);
}

export async function getById<T extends TableName>(
  table: T,
  id: string
): Promise<Tables[T] | null> {
  const rows = await readRaw<Tables[T]>(table);
  return rows.find((r) => (r as { id: string }).id === id) ?? null;
}

export async function findOne<T extends TableName>(
  table: T,
  predicate: (row: Tables[T]) => boolean
): Promise<Tables[T] | null> {
  const rows = await readRaw<Tables[T]>(table);
  return rows.find(predicate) ?? null;
}

export async function insert<T extends TableName>(
  table: T,
  data: Omit<Tables[T], "id" | "created_at"> & Partial<Pick<Tables[T], "id">>
): Promise<Tables[T]> {
  const rows = await readRaw<Tables[T]>(table);
  const row = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...data,
  } as Tables[T];
  rows.push(row);
  await writeRaw(table, rows);
  return row;
}

export async function update<T extends TableName>(
  table: T,
  id: string,
  patch: Partial<Tables[T]>
): Promise<Tables[T] | null> {
  const rows = await readRaw<Tables[T]>(table);
  const idx = rows.findIndex((r) => (r as { id: string }).id === id);
  if (idx === -1) return null;
  rows[idx] = { ...rows[idx], ...patch };
  await writeRaw(table, rows);
  return rows[idx];
}

export async function remove<T extends TableName>(
  table: T,
  id: string
): Promise<boolean> {
  const rows = await readRaw<Tables[T]>(table);
  const next = rows.filter((r) => (r as { id: string }).id !== id);
  if (next.length === rows.length) return false;
  await writeRaw(table, next);
  return true;
}
