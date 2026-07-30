// Authentification admin pour la Phase 0 (local).
// Gate simple par mot de passe + cookie de session.
// Phase 1 : remplacer par Supabase Auth / NextAuth.

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "bv_admin";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "bonvoleur";
}

export function adminToken(): string {
  // En local, jeton statique défini dans .env.local.
  return process.env.ADMIN_TOKEN ?? "dev-admin-token-change-me";
}

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === adminToken();
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
    if (auth === `Bearer ${adminToken()}`) return null;
  }
  return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
}
