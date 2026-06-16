import { NextResponse } from "next/server";
import { insert } from "@/lib/db";
import { findAgent } from "@/lib/agents";
import { runContentPublisher } from "@/lib/content";
import { requireAdmin } from "@/lib/auth";

// Exécute un agent depuis le back-office.
// content-publisher : génère réellement un article en brouillon.
// Autres agents : journalise une exécution (le contenu est produit via Claude Code).
export async function POST(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const { name } = await req.json();
  const agent = findAgent(name);
  if (!agent) {
    return NextResponse.json({ error: "Agent inconnu." }, { status: 404 });
  }

  if (agent.name === "content-publisher") {
    const run = await runContentPublisher("manuel");
    return NextResponse.json(run, { status: 201 });
  }

  const now = new Date().toISOString();
  const run = await insert("agent_runs", {
    agent_name: agent.name,
    started_at: now,
    finished_at: now,
    status: "draft",
    trigger: "manuel",
    summary: `Exécution manuelle de ${agent.label} à lancer via Claude Code.`,
    output_ref: null,
    error: null,
  });
  return NextResponse.json(run, { status: 201 });
}
