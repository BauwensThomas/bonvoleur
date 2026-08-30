import "server-only";

import { NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
let lastCleanup = 0;

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(
  req: Request,
  name: string,
  limit = 120
): NextResponse | null {
  const now = Date.now();
  if (now - lastCleanup > WINDOW_MS) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    lastCleanup = now;
  }

  const key = `${name}:${clientIp(req)}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }

  current.count += 1;
  if (current.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Trop de requêtes. Réessaie plus tard." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}// Protection anti-force-brute par IP.
// Utilise Upstash Redis (UPSTASH_REDIS_REST_URL + TOKEN) si disponible,
// sinon repli sur un store en mémoire (local dev / instance unique).
// Toutes les fonctions sont async pour supporter les deux backends sans
// changer les signatures au niveau des call sites.

import { Redis } from "@upstash/redis";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  blockMs: number;
}

// ---- Backend Redis (Upstash) ----------------------------------------

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!_redis) _redis = new Redis({ url, token });
  return _redis;
}

// ---- Fallback in-memory (local dev / instance unique) ----------------

interface MemEntry { count: number; windowStart: number; blockedUntil?: number; }
const failMem = new Map<string, MemEntry>();
const allowMem = new Map<string, { count: number; windowStart: number }>();

// ---- API publique (async) --------------------------------------------

// Retourne les secondes de blocage restantes si l'IP est bloquée, null sinon.
export async function getBlock(scope: string, ip: string): Promise<number | null> {
  const r = getRedis();
  if (r) {
    const ttl = await r.pttl(`rl:b:${scope}:${ip}`);
    return ttl > 0 ? Math.ceil(ttl / 1000) : null;
  }
  const e = failMem.get(`${scope}:${ip}`);
  if (!e?.blockedUntil) return null;
  const rem = e.blockedUntil - Date.now();
  if (rem <= 0) { failMem.delete(`${scope}:${ip}`); return null; }
  return Math.ceil(rem / 1000);
}

// Enregistre un échec. Retourne les secondes de blocage si le seuil est atteint.
export async function registerFailure(
  scope: string,
  ip: string,
  opts: RateLimitOptions
): Promise<number | null> {
  const r = getRedis();
  if (r) {
    const fk = `rl:f:${scope}:${ip}`;
    const bk = `rl:b:${scope}:${ip}`;
    const n = await r.incr(fk);
    if (n === 1) await r.expire(fk, Math.ceil(opts.windowMs / 1000));
    if (n >= opts.max) {
      await r.set(bk, 1, { px: opts.blockMs });
      return Math.ceil(opts.blockMs / 1000);
    }
    return null;
  }
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const e = failMem.get(key);
  if (!e || now - e.windowStart > opts.windowMs) {
    failMem.set(key, { count: 1, windowStart: now });
    return null;
  }
  e.count++;
  if (e.count >= opts.max) {
    e.blockedUntil = now + opts.blockMs;
    return Math.ceil(opts.blockMs / 1000);
  }
  failMem.set(key, e);
  return null;
}

// Efface l'historique d'une IP (succès d'authentification).
export async function clear(scope: string, ip: string): Promise<void> {
  const r = getRedis();
  if (r) {
    await r.del(`rl:f:${scope}:${ip}`, `rl:b:${scope}:${ip}`);
    return;
  }
  failMem.delete(`${scope}:${ip}`);
}

// Limite simple de débit (sans notion d'échec / blocage).
// Retourne true si la requête est autorisée, false si le plafond est dépassé.
export async function allow(
  scope: string,
  ip: string,
  opts: { windowMs: number; max: number }
): Promise<boolean> {
  const r = getRedis();
  if (r) {
    const key = `rl:a:${scope}:${ip}`;
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, Math.ceil(opts.windowMs / 1000));
    return n <= opts.max;
  }
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const e = allowMem.get(key);
  if (!e || now - e.windowStart > opts.windowMs) {
    allowMem.set(key, { count: 1, windowStart: now });
    return true;
  }
  e.count++;
  allowMem.set(key, e);
  return e.count <= opts.max;
}
