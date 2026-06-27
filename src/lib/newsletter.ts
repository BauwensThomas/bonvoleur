// Newsletter blog hebdomadaire (vendredi soir) : les 3 derniers articles
// publiés, envoyée aux abonnés confirmés qui ne l'ont pas désactivée.

import { getAll, insert } from "./db";
import { sendBatch } from "./email";
import { blogNewsletterEmail } from "./email-templates";
import { unsubscribeUrl } from "./unsubscribe";
import type { AgentTrigger } from "./types";

export interface NewsletterResult {
  ok: boolean;
  sent: number;
  posts: number;
  reason?: string;
}

export async function sendBlogNewsletter(
  trigger: AgentTrigger = "cron"
): Promise<NewsletterResult> {
  const startedAt = new Date().toISOString();
  const result = await runNewsletter();

  // Journalise l'exécution (visible dans l'historique des agents).
  await insert("agent_runs", {
    agent_name: "newsletter",
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: result.sent > 0 ? "success" : "draft",
    trigger,
    summary: result.ok
      ? `Newsletter envoyée à ${result.sent} abonné(s) (${result.posts} article(s)).`
      : `Newsletter non envoyée : ${result.reason ?? "raison inconnue"}.`,
    output_ref: null,
    error: null,
  });

  return result;
}

async function runNewsletter(): Promise<NewsletterResult> {
  const posts = (await getAll("posts"))
    .filter((p) => p.status === "published")
    .sort((a, b) =>
      (b.published_at ?? b.created_at).localeCompare(
        a.published_at ?? a.created_at
      )
    )
    .slice(0, 3);

  if (posts.length === 0) {
    return { ok: false, sent: 0, posts: 0, reason: "aucun article publié" };
  }

  // Abonnés ciblés : inscription confirmée, non désinscrits, newsletter activée
  // (le champ est optionnel -> activée par défaut, donc on exclut seulement
  // ceux qui l'ont explicitement mise à false).
  const subs = (await getAll("subscribers")).filter(
    (s) => s.consent_at && !s.unsubscribed_at && s.newsletter !== false
  );

  // Envoi par BATCH, groupé par tier (routage provider) -> pas de timeout Vercel
  // ni de souci de limite de débit, quel que soit le nombre d'abonnés.
  let sent = 0;
  for (const t of ["premium", "free"] as const) {
    const group = subs.filter((s) => (s.tier === "premium") === (t === "premium"));
    if (group.length === 0) continue;
    const msgs = group.map((s) =>
      blogNewsletterEmail(
        s.email,
        posts,
        unsubscribeUrl(s.email, s.unsubscribe_token),
        s.unsubscribe_token ?? undefined
      )
    );
    const oks = await sendBatch(msgs, t);
    sent += oks.filter(Boolean).length;
  }

  return { ok: true, sent, posts: posts.length };
}
