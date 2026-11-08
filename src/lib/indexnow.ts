// IndexNow : previent Bing, Yandex et les autres moteurs participants (dont
// ceux qui alimentent les assistants IA via l'index Bing) qu'une URL publique
// vient d'etre creee ou modifiee. Google n'utilise PAS IndexNow : pour lui, le
// sitemap re-signale (gsc.ts submitSitemap) reste le seul canal officiel.
// Ne leve jamais : un echec de ping ne doit jamais bloquer une publication.
import "server-only";

import { site } from "./site";

const ENDPOINT = "https://api.indexnow.org/indexnow";
const HOST = "bonvoleur.com";
const MAX_URLS_PER_CALL = 10000;

export interface IndexNowResult {
  ok: boolean;
  submitted: number;
  status?: number;
  error?: string;
}

// Accepte des chemins ("/blog/x") ou des URLs completes, ne garde que les URLs
// du site (host bonvoleur.com) et les normalise en https://www.bonvoleur.com.
export function normalizeIndexNowUrls(urls: string[]): string[] {
  const out = new Set<string>();
  for (const raw of urls) {
    try {
      const u = new URL(raw, site.canonicalBase);
      if (u.hostname !== HOST && u.hostname !== `www.${HOST}`) continue;
      const path = u.pathname.replace(/\/$/, "");
      out.add(`${site.canonicalBase}${path}`);
    } catch {
      // URL invalide : ignoree.
    }
  }
  return [...out];
}

export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    console.warn("[indexnow] INDEXNOW_KEY absente : ping ignore.");
    return { ok: false, submitted: 0, error: "INDEXNOW_KEY absente" };
  }
  const list = normalizeIndexNowUrls(urls).slice(0, MAX_URLS_PER_CALL);
  if (list.length === 0) return { ok: true, submitted: 0 };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key,
        keyLocation: `${site.canonicalBase}/${key}.txt`,
        urlList: list,
      }),
    });
    // 200 et 202 = accepte (202 : cle en cours de verification).
    if (res.status === 200 || res.status === 202) {
      console.log(`[indexnow] ${list.length} URL(s) soumise(s) (HTTP ${res.status}).`);
      return { ok: true, submitted: list.length, status: res.status };
    }
    const text = await res.text().catch(() => "");
    console.error(`[indexnow] Refus HTTP ${res.status} : ${text.slice(0, 200)}`);
    return { ok: false, submitted: 0, status: res.status, error: text.slice(0, 200) || `HTTP ${res.status}` };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erreur reseau";
    console.error(`[indexnow] Echec : ${error}`);
    return { ok: false, submitted: 0, error };
  }
}
