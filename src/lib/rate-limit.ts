// Protection anti-force-brute par IP.
// Phase 0 (local) : compteur en mémoire (suffisant pour un seul process).
// Phase 1 (Vercel/serverless) : remplacer le store par un store persistant
// partagé (Upstash Redis, Supabase), car la mémoire n'est pas partagée
// entre instances. Les signatures de fonctions ne changeront pas.

interface Entry {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

const store = new Map<string, Entry>();

export interface RateLimitOptions {
  windowMs: number; // fenêtre d'observation
  max: number; // nombre d'échecs tolérés dans la fenêtre
  blockMs: number; // durée du blocage une fois le seuil atteint
}

// Préfixe pour éviter les collisions entre différents usages (login, subscribe).
function k(scope: string, ip: string): string {
  return `${scope}:${ip}`;
}

// Retourne le nombre de secondes restantes si l'IP est bloquée, sinon null.
export function getBlock(scope: string, ip: string): number | null {
  const e = store.get(k(scope, ip));
  if (!e?.blockedUntil) return null;
  const remaining = e.blockedUntil - Date.now();
  if (remaining <= 0) {
    store.delete(k(scope, ip));
    return null;
  }
  return Math.ceil(remaining / 1000);
}

// Enregistre un échec. Si le seuil est dépassé, pose un blocage.
// Retourne les secondes de blocage si le seuil vient d'être atteint.
export function registerFailure(
  scope: string,
  ip: string,
  opts: RateLimitOptions
): number | null {
  const key = k(scope, ip);
  const now = Date.now();
  const e = store.get(key);

  if (!e || now - e.windowStart > opts.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return null;
  }

  e.count += 1;
  if (e.count >= opts.max) {
    e.blockedUntil = now + opts.blockMs;
    return Math.ceil(opts.blockMs / 1000);
  }
  store.set(key, e);
  return null;
}

// À appeler en cas de succès : on efface l'historique de l'IP.
export function clear(scope: string, ip: string): void {
  store.delete(k(scope, ip));
}

// Limiteur simple (sans notion d'échec) : limite le nombre de requêtes par
// fenêtre. Retourne true si la requête est autorisée, false si dépassée.
export function allow(
  scope: string,
  ip: string,
  opts: { windowMs: number; max: number }
): boolean {
  const key = k(scope, ip);
  const now = Date.now();
  const e = store.get(key);
  if (!e || now - e.windowStart > opts.windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }
  e.count += 1;
  store.set(key, e);
  return e.count <= opts.max;
}
