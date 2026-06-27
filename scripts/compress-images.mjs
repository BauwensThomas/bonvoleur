// Compresse les images destinations Supabase trop lourdes (> 300 KB)
// et les images hero locales. Utilise sharp.
// Usage : node scripts/compress-images.mjs

import sharp from "sharp";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";

const env = {};
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const SB = env.SUPABASE_URL;
const SK = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: SK, Authorization: `Bearer ${SK}` };

// ---- 1. Images Supabase destinations ----------------------------------------

async function listImages(prefix) {
  const r = await fetch(`${SB}/storage/v1/object/list/photos`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 200 }),
  });
  return r.json();
}

async function downloadImage(name) {
  const r = await fetch(`${SB}/storage/v1/object/photos/${name}`, { headers });
  if (!r.ok) throw new Error(`Download ${name} -> ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function uploadImage(name, buf, mime) {
  const r = await fetch(`${SB}/storage/v1/object/photos/${name}`, {
    method: "PUT",
    headers: {
      ...headers,
      "Content-Type": mime,
      "x-upsert": "true",
      "cache-control": "public, max-age=31536000",
    },
    body: buf,
  });
  if (!r.ok) throw new Error(`Upload ${name} -> ${r.status}: ${await r.text()}`);
}

const TARGET_KB = 250; // max après compression (WebP)
const files = await listImages("destinations/");

let skipped = 0, compressed = 0;
for (const f of files) {
  const sizeKb = Math.round((f.metadata?.size ?? 0) / 1024);
  if (sizeKb <= TARGET_KB) { skipped++; continue; }

  const name = `destinations/${f.name}`;
  process.stdout.write(`${f.name} (${sizeKb} KB) -> `);

  try {
    const orig = await downloadImage(name);
    // Compression WebP qualité adaptative : 75 par défaut, on descend si trop lourd
    let webp = await sharp(orig).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
    if (webp.length > TARGET_KB * 1024) {
      webp = await sharp(orig).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 65 }).toBuffer();
    }
    // On remplace en gardant l'extension .jpg mais en envoyant du WebP
    // (le bucket sert content-type depuis le header qu'on envoie)
    await uploadImage(name, webp, "image/webp");
    process.stdout.write(`${Math.round(webp.length / 1024)} KB WebP ✓\n`);
    compressed++;
  } catch (e) {
    process.stdout.write(`ERREUR: ${e.message}\n`);
  }
}
console.log(`\nDestinations: ${compressed} compressées, ${skipped} déjà OK.`);

// ---- 2. Hero images locales (/public/hero/*.jpg) ----------------------------

const heroDir = new URL("../public/hero/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const heroFiles = ["01-nuit.jpg", "02-lever.jpg", "03-plage.jpg", "04-ville.jpg"];

console.log("\nHero images locales :");
for (const file of heroFiles) {
  const p = path.join(heroDir, file);
  let orig;
  try { orig = await readFile(p); } catch { continue; }
  const sizeKb = Math.round(orig.length / 1024);
  if (sizeKb <= 150) { console.log(`  ${file} (${sizeKb} KB) -> déjà OK`); continue; }

  process.stdout.write(`  ${file} (${sizeKb} KB) -> `);
  const compressed = await sharp(orig)
    .resize({ width: 1920, withoutEnlargement: true })
    .jpeg({ quality: 75, progressive: true })
    .toBuffer();
  await writeFile(p, compressed);
  console.log(`${Math.round(compressed.length / 1024)} KB ✓`);
}
console.log("\nTerminé.");
