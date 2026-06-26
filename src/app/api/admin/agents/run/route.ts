import { NextResponse } from "next/server";
import { insert } from "@/lib/db";
import { findAgent } from "@/lib/agents";
import { runContentPublisher } from "@/lib/content";
import { sendBlogNewsletter } from "@/lib/newsletter";
import { runSocialClipper } from "@/lib/social";
import { dispatchWorkflow } from "@/lib/github-actions";
import { requireAdmin } from "@/lib/auth";

// content-publisher (génération IA longue) peut tourner depuis ici -> budget max.
export const maxDuration = 300;

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

  // Newsletter : envoie tout de suite les 3 derniers articles (et logue le run).
  if (agent.name === "newsletter") {
    const result = await sendBlogNewsletter("manuel");
    return NextResponse.json(result, { status: 201 });
  }

  // Social Clipper : (re)envoie le webhook Make pour le dernier article publié.
  if (agent.name === "social-clipper") {
    const start = new Date().toISOString();
    const result = await runSocialClipper();
    const run = await insert("agent_runs", {
      agent_name: "social-clipper",
      started_at: start,
      finished_at: new Date().toISOString(),
      status: result.ok ? "success" : "draft",
      trigger: "manuel",
      summary: result.ok
        ? `Webhook Make envoyé pour : "${result.post}".`
        : `Non envoyé : ${result.reason}.`,
      output_ref: null,
      error: null,
    });
    return NextResponse.json(run, { status: 201 });
  }

  // SEO Route : (re)genere les fiches destinations sur GitHub Actions, utile
  // apres un scan lance a la main pour mettre a jour /vols-pas-chers.
  if (agent.name === "seo-route") {
    const res = await dispatchWorkflow("generate-routes.yml");
    const now = new Date().toISOString();
    const run = await insert("agent_runs", {
      agent_name: "seo-route",
      started_at: now,
      finished_at: now,
      status: res.ok ? "success" : "error",
      trigger: "manuel",
      summary: res.ok
        ? "Generation des fiches destinations lancee sur GitHub Actions."
        : "Echec du declenchement de la generation des fiches.",
      output_ref: null,
      error: res.ok ? null : res.error ?? null,
    });
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
