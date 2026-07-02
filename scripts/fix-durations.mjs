// Corrige les champs `duration` des fiches routes qui mentionnent
// des villes ou aéroports de départ spécifiques -> durée générique.
// Usage : node scripts/fix-durations.mjs

import { readFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";

const env = { ...process.env };
try {
  for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* CI */ }

const SB = env.SUPABASE_URL;
const SK = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !SK) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants.");
const sbHeaders = { apikey: SK, Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };
const model = env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// Patterns qui trahissent une durée mentionnant une ville/aéroport de départ.
const SPECIFIC = [
  /Paris/i, /Bruxelles/i, /Charleroi/i, /Lyon/i, /Nice/i, /Marseille/i,
  /Bordeaux/i, /Toulouse/i, /Nantes/i, /Lille/i, /Montpellier/i, /Strasbourg/i,
  /Liège/i, /Anvers/i, /Ostende/i, /Beauvais/i, /Orly/i,
  /\bBRU\b/, /\bCDG\b/, /\bCRL\b/, /\bLYS\b/, /\bORY\b/, /\bBVA\b/,
];

function isSpecific(duration) {
  return SPECIFIC.some((p) => p.test(duration ?? ""));
}

// 1. Récupère toutes les routes avec slug, destination et durée.
const routes = await fetch(
  `${SB}/rest/v1/routes?select=slug,destination_city,duration`,
  { headers: sbHeaders }
).then((r) => (r.ok ? r.json() : [])).catch(() => []);

console.log(`${routes.length} fiche(s) en base.`);

// 2. Regroupe par destination (1 seul appel Claude par ville).
const byDest = new Map(); // destination_city -> { slugs, oldDuration }
for (const r of routes) {
  if (!isSpecific(r.duration)) continue;
  if (!byDest.has(r.destination_city)) {
    byDest.set(r.destination_city, { slugs: [], oldDuration: r.duration });
  }
  byDest.get(r.destination_city).slugs.push(r.slug);
}

console.log(`${byDest.size} destination(s) a corriger.\n`);
if (byDest.size === 0) { console.log("Rien a faire."); process.exit(0); }

// 3. Régénère et met à jour.
for (const [city, { slugs, oldDuration }] of byDest) {
  process.stdout.write(`${city} (${slugs.length} fiche(s))... `);
  console.log(`\n  Ancienne duree : "${oldDuration}"`);

  let newDuration;
  try {
    const res = await client.messages.create({
      model, max_tokens: 150,
      messages: [{
        role: "user",
        content:
          `Donne uniquement la duree de vol vers ${city} depuis la Belgique et la France, ` +
          `en fourchette generale SANS mentionner de ville ou d'aeroport de depart precis. ` +
          `Format court, exemples : "2h30 a 4h selon l'aeroport de depart", ` +
          `"environ 3h en direct, 8 a 12h avec escale". ` +
          `Reponds avec UNIQUEMENT la duree, en francais, sans phrase autour, sans tiret long.`,
      }],
    });
    newDuration = res.content[0]?.text?.trim();
  } catch (e) {
    console.log(`  ERREUR Claude : ${e.message}`);
    continue;
  }

  if (!newDuration) { console.log("  Reponse vide, ignore."); continue; }
  console.log(`  Nouvelle duree : "${newDuration}"`);

  let updated = 0;
  for (const slug of slugs) {
    const r = await fetch(`${SB}/rest/v1/routes?slug=eq.${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { ...sbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ duration: newDuration, updated_at: new Date().toISOString() }),
    });
    if (r.ok) updated++;
  }
  console.log(`  ${updated}/${slugs.length} fiche(s) mise(s) a jour.\n`);
}

console.log("Termine.");
