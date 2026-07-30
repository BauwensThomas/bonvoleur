// Authentification admin pour la Phase 0 (local).
// Gate simple par mot de passe + cookie de session.
// Phase 1 : remplacer par Supabase Auth / NextAuth.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "bv_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "bonvoleur";
}

export function adminToken(): string {
  // En local, jeton statique défini dans .env.local.
  return process.env.ADMIN_TOKEN ?? "dev-admin-token-change-me";
}

// Comparaison à temps constant : une comparaison `===` classique sort dès le
// premier octet différent, ce qui fuit (en théorie) la longueur du préfixe
// correct via le temps de réponse. Sans intérêt pratique ici (jeton long,
// attaque réseau), mais coût nul à corriger.
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const cookie = store.get(ADMIN_COOKIE)?.value;
  return cookie !== undefined && safeEqual(cookie, adminToken());
}

// À appeler au début d'une route API admin (défense en profondeur, en plus
// du proxy). Retourne une réponse 401 si non authentifié, sinon null.
// Si `req` est fourni, accepte AUSSI un jeton bearer (Authorization: Bearer
// <ADMIN_TOKEN>) en plus du cookie de session - nécessaire pour les agents
// automatisés (ex. content-publisher) qui n'ont pas de session navigateur.
export async function requireAdmin(req?: Request): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  if (req) {
    const auth = req.headers.get("authorization");
    if (auth && safeEqual(auth, `Bearer ${adminToken()}`)) return null;
  }
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
}
