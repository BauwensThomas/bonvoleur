import { NextResponse } from "next/server";
import sitemap from "@/app/sitemap";
import { submitToIndexNow } from "@/lib/indexnow";

// Filet quotidien : soumet a IndexNow les URLs publiques dont le lastmod du
// sitemap date de moins de 26 h (pages ajoutees ou modifiees, y compris par un
// deploiement). Planifie dans vercel.json, protege par CRON_SECRET.
// `?all=1` soumet tout le sitemap (a lancer a la main apres un gros changement).
export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const all = new URL(req.url).searchParams.get("all") === "1";
  const since = Date.now() - 26 * 3600 * 1000;
  const entries = await sitemap();
  const urls = entries
    .filter((e) => all || (e.lastModified && new Date(e.lastModified).getTime() >= since))
    .map((e) => e.url);
  const result = await submitToIndexNow(urls);
  return NextResponse.json({ ...result, candidates: urls.length }, { status: result.ok ? 200 : 502 });
}
