import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAll, insert, findOne, update } from "@/lib/db";
import type { SeoSuggestionType } from "@/lib/types";

const VALID_TYPES: SeoSuggestionType[] = ["title", "meta_description", "internal_links", "content"];

export async function GET(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const status = new URL(req.url).searchParams.get("status");
  let rows = await getAll("seo_suggestions");
  if (status) rows = rows.filter((r) => r.status === status);
  rows.sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  return NextResponse.json(rows);
}

// Créée par l'agent seo-suggester (jeton bearer, même pattern que
// POST /api/admin/posts pour content-publisher) - jamais d'insert direct
// Supabase depuis l'agent, pour garder cette route comme unique point d'entrée
// (garde-fous : type valide, pas de doublon en attente pour la même page+type).
export async function POST(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const b = await req.json();
  const page = String(b.page ?? "").trim();
  const suggestionType = String(b.suggestion_type ?? "");
  const proposedValue = String(b.proposed_value ?? "").trim();

  if (!page || !proposedValue) {
    return NextResponse.json({ error: "page et proposed_value requis." }, { status: 400 });
  }
  if (!VALID_TYPES.includes(suggestionType as SeoSuggestionType)) {
    return NextResponse.json(
      { error: `suggestion_type invalide (attendu : ${VALID_TYPES.join(", ")}).` },
      { status: 400 }
    );
  }

  // Pas de doublon "en attente" pour la même page + le même type - une
  // suggestion déjà tranchée (approved/rejected) n'empêche pas d'en proposer
  // une nouvelle si un nouveau run détecte à nouveau le problème.
  const existing = await findOne(
    "seo_suggestions",
    (s) => s.page === page && s.suggestion_type === suggestionType && s.status === "pending"
  );
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true, id: existing.id });
  }

  const row = await insert("seo_suggestions", {
    page,
    suggestion_type: suggestionType as SeoSuggestionType,
    current_value: b.current_value ? String(b.current_value) : null,
    proposed_value: proposedValue,
    reason: b.reason ? String(b.reason) : null,
    status: "pending",
    detected_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id: row.id });
}

// Validation humaine (page /admin/seo-suggestions) : passe une proposition à
// 'approved' ou 'rejected'. Ne déclenche PAS encore l'application réelle du
// changement (étape 8, pas construite) - seulement le changement de statut.
export async function PUT(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  if (!["pending", "approved", "rejected"].includes(b.status)) {
    return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
  }
  const row = await update("seo_suggestions", b.id, { status: b.status });
  if (!row) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json(row);
}
