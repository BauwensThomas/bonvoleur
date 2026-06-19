// Génère du contenu UNIQUE et RÉEL pour chaque page route SEO, en s'appuyant
// sur une recherche web (Claude + web_search) pour des infos vérifiables
// (compagnies qui opèrent la route, durée de vol, meilleure période).
// Résultat figé dans src/lib/route-content.ts (pas d'IA au runtime).
// Résumable : relance sans refaire les routes déjà générées.
// Lancer : node scripts/generate-route-content.mjs

import { readFile, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const env = {};
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const ORIGIN = { BRU: "Bruxelles", CRL: "Charleroi", CDG: "Paris", LYS: "Lyon" };
const DEST = {
  LIS: "Lisbonne", BCN: "Barcelone", RAK: "Marrakech", FCO: "Rome", JFK: "New York",
  BKK: "Bangkok", AGP: "Malaga", OPO: "Porto", KRK: "Cracovie", ALC: "Alicante", ATH: "Athènes",
};
const WATCH = {
  BRU: ["LIS", "BCN", "RAK", "FCO", "JFK", "BKK"],
  CRL: ["AGP", "OPO", "FCO", "KRK", "ALC"],
  CDG: ["JFK", "LIS", "BCN", "ATH", "BKK"],
  LYS: ["BCN", "LIS", "FCO"],
};
const slug = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const routes = Object.entries(WATCH).flatMap(([o, ds]) =>
  ds.map((d) => ({ o, d, oc: ORIGIN[o], dc: DEST[d], slug: `${slug(ORIGIN[o])}-${slug(DEST[d])}` }))
);

const TMP = "scripts/.route-content.json";
let done = {};
try { done = JSON.parse(await readFile(TMP, "utf-8")); } catch {}

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const model = env.ANTHROPIC_MODEL || "claude-opus-4-8";

function extractJson(text) {
  const i = text.indexOf("{"); const j = text.lastIndexOf("}");
  if (i === -1 || j === -1) return null;
  try { return JSON.parse(text.slice(i, j + 1)); } catch { return null; }
}

for (const r of routes) {
  if (done[r.slug]) { console.log(`skip ${r.slug} (deja fait)`); continue; }
  process.stdout.write(`${r.oc} - ${r.dc}... `);
  try {
    const res = await client.messages.create({
      model, max_tokens: 2000,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }],
      messages: [{
        role: "user",
        content: `Cherche sur le web des infos RÉELLES et vérifiables sur la liaison aérienne ${r.oc} (${r.o}) vers ${r.dc} (${r.d}). Donne uniquement des faits exacts (ne devine pas). Réponds STRICTEMENT en JSON, sans texte autour, avec ce format :
{
 "intro": "2 à 3 phrases factuelles sur cette liaison (fréquence, direct ou escale, contexte).",
 "airlines": ["compagnies qui opèrent réellement cette route"],
 "duration": "durée de vol réaliste, ex 'environ 2h en direct' ou 'environ 9h, souvent avec escale'",
 "bestPeriod": "meilleure période pour partir (prix bas et/ou météo)",
 "tips": ["3 à 4 conseils concrets et réels pour cette destination ou cette route"]
}
IMPÉRATIF : écris un français correct avec TOUS les accents (é, è, ê, à, â, ç, ô, î, ù...). Pas d'émoji, pas de tiret long (em dash). Pas de prix inventés présentés comme garantis.` }],
    });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
    const data = extractJson(text);
    if (!data || !data.intro) { console.log("ECHEC parse"); continue; }
    done[r.slug] = {
      intro: String(data.intro || ""),
      airlines: Array.isArray(data.airlines) ? data.airlines.map(String) : [],
      duration: String(data.duration || ""),
      bestPeriod: String(data.bestPeriod || ""),
      tips: Array.isArray(data.tips) ? data.tips.map(String) : [],
    };
    await writeFile(TMP, JSON.stringify(done, null, 2));
    console.log("OK");
  } catch (e) {
    console.log("ERREUR", e.message);
  }
}

// Ecrit le fichier TS final.
const body = Object.entries(done)
  .map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join("\n");
const ts = `// Contenu RÉEL par route (généré via Claude + recherche web, figé).
// Régénérer : node scripts/generate-route-content.mjs
export interface RouteContent {
  intro: string;
  airlines: string[];
  duration: string;
  bestPeriod: string;
  tips: string[];
}

export const ROUTE_CONTENT: Record<string, RouteContent> = {
${body}
};
`;
await writeFile("src/lib/route-content.ts", ts, "utf-8");
console.log(`\nEcrit src/lib/route-content.ts (${Object.keys(done).length} routes).`);
