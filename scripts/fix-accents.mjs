// Réaccentue les articles de blog (table posts) dont le texte est sorti SANS
// accents (bug ponctuel de génération). Demande à Claude d'ajouter UNIQUEMENT
// les accents manquants, sans rien changer d'autre, puis met à jour Supabase.
// Lancer : node scripts/fix-accents.mjs            (corrige les posts détectés)
//          node scripts/fix-accents.mjs <id>       (corrige un post précis)

import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const env = { ...process.env };
try {
  for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* CI : on garde process.env */
}

const SB = env.SUPABASE_URL;
const SK = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !SK) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.");
const sbHeaders = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const MODEL = env.ANTHROPIC_MODEL || "claude-haiku-4-5";

const ACCENT_RE = /[àâäçéèêëîïôöùûüœ]/i;
// Un texte français un peu long SANS aucun accent est quasi sûrement cassé.
const looksUnaccented = (t) => typeof t === "string" && t.length > 60 && !ACCENT_RE.test(t);

async function reaccentuate(text) {
  if (!text || ACCENT_RE.test(text)) return text; // déjà accentué : on ne touche pas
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        messages: [{
          role: "user",
          content: `Ajoute UNIQUEMENT les accents francais manquants a ce texte (e -> é/è/ê, a -> à/â, c -> ç, o -> ô, u -> ù/û, i -> î, etc., et oe -> œ quand il le faut). Ne change RIEN d'autre : ni les mots, ni la ponctuation, ni le Markdown, ni les liens, ni les majuscules, ni les retours a la ligne. Ne traduis pas, n'ajoute aucun commentaire. Reponds UNIQUEMENT avec le texte corrige.\n\n---\n${text}`,
        }],
      });
      const out = res.content.find((b) => b.type === "text");
      let fixed = out && out.type === "text" ? out.text.trim() : null;
      if (fixed) {
        // Le modèle renvoie parfois le texte encadré par le délimiteur "---" :
        // on retire un "---" isolé en tête/queue pour ne pas polluer le contenu.
        fixed = fixed.replace(/^---\s*(\n|$)/, "").replace(/\n---\s*$/, "").trim();
        return fixed;
      }
    } catch (e) {
      const s = e?.status;
      if (!(s === 429 || s === 529 || (typeof s === "number" && s >= 500)) || attempt === 3) {
        console.log(`  (erreur réaccentuation ${s ?? e?.message ?? e})`);
        return text;
      }
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    }
  }
  return text;
}

const onlyId = process.argv[2];
const filter = onlyId ? `id=eq.${onlyId}` : `status=eq.published`;
const posts = await fetch(`${SB}/rest/v1/posts?${filter}&select=*`, { headers: sbHeaders })
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => []);

let fixedCount = 0;
for (const p of posts) {
  if (!onlyId && !looksUnaccented(p.content)) continue; // déjà OK
  process.stdout.write(`"${p.title}"... `);

  const patch = {
    title: await reaccentuate(p.title),
    excerpt: await reaccentuate(p.excerpt),
    meta_title: await reaccentuate(p.meta_title),
    meta_description: await reaccentuate(p.meta_description),
    content: await reaccentuate(p.content),
  };
  if (Array.isArray(p.faq)) {
    patch.faq = [];
    for (const f of p.faq) {
      patch.faq.push({
        question: await reaccentuate(f.question),
        answer: await reaccentuate(f.answer),
      });
    }
  }

  const res = await fetch(`${SB}/rest/v1/posts?id=eq.${p.id}`, {
    method: "PATCH",
    headers: { ...sbHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (res.ok) {
    fixedCount++;
    console.log("corrigé");
  } else {
    console.log(`ERREUR ${res.status}: ${await res.text()}`);
  }
}

console.log(`\nTerminé. ${fixedCount} article(s) réaccentué(s).`);
