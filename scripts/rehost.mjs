// Ré-héberge une image distante (souvent Unsplash) dans Supabase Storage, en
// version ALLEGEE, et renvoie l'URL publique Supabase. Si quoi que ce soit
// échoue, renvoie l'URL d'origine (jamais de casse).
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

let _sb = null;
let _bucketReady = false;

function client(env) {
  if (!_sb) {
    _sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _sb;
}

async function ensureBucket(sb) {
  if (_bucketReady) return;
  try {
    await sb.storage.createBucket("photos", { public: true });
  } catch {
    /* existe déjà */
  }
  _bucketReady = true;
}

const slugify = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Compresse avec Sharp pour rester entre 50 et 100 KB.
// Essaie différentes qualités à 1000px puis 800px si nécessaire.
async function compressToTarget(input) {
  const src = Buffer.from(input);
  for (const width of [1000, 800]) {
    for (const q of [75, 60, 45, 35]) {
      const out = await sharp(src)
        .resize({ width, withoutEnlargement: true })
        .jpeg({ quality: q, mozjpeg: true })
        .toBuffer();
      if (out.byteLength <= 100 * 1024) return out;
    }
  }
  // Ultime repli : retourne la dernière tentative même si > 100 KB.
  return await sharp(src).resize({ width: 800 }).jpeg({ quality: 35, mozjpeg: true }).toBuffer();
}

// env: {SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY}. prefix: "destinations"|"articles".
export async function rehostImage(env, sourceUrl, prefix, name) {
  if (!sourceUrl) return null;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return sourceUrl;
  // Déjà sur notre Storage -> on garde.
  if (sourceUrl.includes("/storage/v1/object/public/photos/")) return sourceUrl;

  const base = sourceUrl.split("?")[0];
  const fetchUrl = /(images|plus)\.unsplash\.com/.test(sourceUrl)
    ? `${base}?auto=format&fit=max&w=1200&q=85&fm=jpg`
    : sourceUrl;

  try {
    const r = await fetch(fetchUrl, {
      headers: { "User-Agent": "Mozilla/5.0 BonVoleur" },
    });
    if (!r.ok) return sourceUrl;
    const raw = await r.arrayBuffer();
    if (raw.byteLength === 0) return sourceUrl;

    const buf = await compressToTarget(raw);

    const sb = client(env);
    await ensureBucket(sb);
    const path = `${prefix}/${slugify(name)}.jpg`;
    const { error } = await sb.storage
      .from("photos")
      .upload(path, new Uint8Array(buf), { contentType: "image/jpeg", upsert: true });
    if (error) {
      console.log(`  rehost ${name}: ${error.message}`);
      return sourceUrl;
    }
    return sb.storage.from("photos").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.log(`  rehost ${name}: ${e.message}`);
    return sourceUrl;
  }
}
