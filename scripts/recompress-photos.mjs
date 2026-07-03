// Recompresse les photos de destinations trop lourdes dans Supabase Storage.
// Usage : node scripts/recompress-photos.mjs [--max-kb 70] [--city abidjan]
// Sans --city, traite TOUTES les destinations au-dessus du seuil.

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const _maxKbIdx = process.argv.indexOf("--max-kb");
const MAX_KB = _maxKbIdx !== -1 ? parseInt(process.argv[_maxKbIdx + 1], 10) : 70;
const _widthIdx = process.argv.indexOf("--width");
const WIDTH = _widthIdx !== -1 ? parseInt(process.argv[_widthIdx + 1], 10) : 1000;
const CITY_FILTER = (() => {
  const idx = process.argv.indexOf("--city");
  return idx !== -1 ? process.argv[idx + 1]?.toLowerCase() : null;
})();

const env = { ...process.env };
try {
  for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* CI */ }

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: files, error } = await sb.storage.from("photos").list("destinations", { limit: 1000 });
if (error) { console.error("Erreur listing:", error.message); process.exit(1); }

const targets = files.filter((f) => {
  const sizeKb = ((f.metadata?.size ?? 0) / 1024);
  if (sizeKb <= MAX_KB) return false;
  if (CITY_FILTER && !f.name.startsWith(CITY_FILTER)) return false;
  return true;
});

console.log(`${targets.length} photo(s) au-dessus de ${MAX_KB} KB${CITY_FILTER ? ` pour "${CITY_FILTER}"` : ""}.`);
if (targets.length === 0) process.exit(0);

let recompressed = 0;
for (const f of targets) {
  const path = `destinations/${f.name}`;
  const sizeKb = Math.round((f.metadata?.size ?? 0) / 1024);
  process.stdout.write(`${f.name} (${sizeKb} KB)... `);

  // Télécharge depuis Storage.
  const { data: blob, error: dlErr } = await sb.storage.from("photos").download(path);
  if (dlErr || !blob) { console.log(`erreur téléchargement: ${dlErr?.message}`); continue; }

  const raw = Buffer.from(await blob.arrayBuffer());

  // Réduit progressivement la qualité jusqu'à passer sous le seuil.
  let compressed = raw;
  for (const q of [65, 55, 45, 35]) {
    compressed = await sharp(raw)
      .resize({ width: WIDTH, withoutEnlargement: true })
      .jpeg({ quality: q, mozjpeg: true })
      .toBuffer();
    if (compressed.byteLength / 1024 <= MAX_KB) break;
  }

  const newKb = Math.round(compressed.byteLength / 1024);
  const { error: upErr } = await sb.storage
    .from("photos")
    .upload(path, new Uint8Array(compressed), { contentType: "image/jpeg", upsert: true });

  if (upErr) { console.log(`erreur upload: ${upErr.message}`); continue; }
  console.log(`OK -> ${newKb} KB`);
  recompressed++;
}

console.log(`\nTerminé. ${recompressed}/${targets.length} photo(s) recompressée(s).`);
