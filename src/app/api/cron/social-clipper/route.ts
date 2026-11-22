import { NextResponse } from "next/server";
import { runSocialClipper } from "@/lib/social";
import { countAgentRuns, getAll } from "@/lib/db";
import { blogSlotStart, dueSocialSlot } from "@/lib/blog-schedule";

// Deux usages, protégés par CRON_SECRET :
//  - ?scheduled=1 (Vercel Cron, voir vercel.json) : poste sur Instagram/Facebook
//    l'article du créneau, 2 h après sa publication (20h lun/mer/ven, 10h30
//    dim., heure de Bruxelles). Un seul envoi réussi par article, 2 essais en
//    erreur au maximum.
//  - sans paramètre : rejoue l'envoi du webhook Make pour le dernier article
//    (test / relance). ?slug=... pour un article précis (backfill).
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const url = new URL(req.url);

  if (url.searchParams.get("scheduled") === "1") {
    if (!dueSocialSlot()) return NextResponse.json({ ok: true, skipped: "hors créneau" });
    const blogStart = blogSlotStart(new Date());
    if (!blogStart) return NextResponse.json({ ok: true, skipped: "pas de créneau aujourd'hui" });

    // Article publié depuis 1 h avant le créneau de blog du jour.
    const from = new Date(blogStart.getTime() - 60 * 60000).toISOString();
    const posts = (await getAll("posts", "id,slug,status,published_at")).filter(
      (p) => p.status === "published" && p.published_at && p.published_at >= from
    );
    const post = posts.sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))[0];
    if (!post) return NextResponse.json({ ok: true, skipped: "aucun article publié pour ce créneau" });

    if ((await countAgentRuns("social-clipper", { status: "success", outputRef: post.id })) > 0) {
      return NextResponse.json({ ok: true, skipped: "déjà posté sur les réseaux" });
    }
    if ((await countAgentRuns("social-clipper", { status: "error", outputRef: post.id })) >= 2) {
      return NextResponse.json({ ok: false, skipped: "2 échecs, plus d'essai automatique" });
    }
    const result = await runSocialClipper(post.slug, "cron");
    return NextResponse.json(result);
  }

  const slug = url.searchParams.get("slug") ?? undefined;
  const result = await runSocialClipper(slug, "cron");
  return NextResponse.json(result);
}
