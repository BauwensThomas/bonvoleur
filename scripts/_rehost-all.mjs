// Ré-héberge dans Supabase Storage toutes les images existantes (photos de
// destination + couvertures d'articles) qui pointent encore vers une URL
// externe. Version allégée. Idempotent. Script jetable.
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { rehostImage } from "./rehost.mjs";

const env = {};
for (const l of (await readFile(".env.local", "utf-8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const ext = (u) => u && !u.includes("/storage/v1/object/public/photos/");
const cache = new Map(); // url source -> url rehebergee (evite de re-uploader)

async function rehost(url, prefix, name) {
  if (cache.has(url)) return cache.get(url);
  const out = await rehostImage(env, url, prefix, name);
  cache.set(url, out);
  return out;
}

// 1) Photos de destination (table routes).
const { data: routes } = await sb
  .from("routes")
  .select("slug,destination_city,image_url");
let r1 = 0;
for (const r of routes) {
  if (!ext(r.image_url)) continue;
  const url = await rehost(r.image_url, "destinations", r.destination_city);
  if (url && url !== r.image_url) {
    const { error } = await sb
      .from("routes")
      .update({ image_url: url, updated_at: new Date().toISOString() })
      .eq("slug", r.slug);
    if (!error) r1++;
  }
}
console.log(`Photos destination re-hebergees : ${r1} route(s).`);

// 2) Couvertures d'articles (table posts).
const { data: posts } = await sb.from("posts").select("slug,cover_image");
let r2 = 0;
for (const p of posts) {
  if (!ext(p.cover_image)) continue;
  const url = await rehost(p.cover_image, "articles", p.slug);
  if (url && url !== p.cover_image) {
    const { error } = await sb
      .from("posts")
      .update({ cover_image: url, updated_at: new Date().toISOString() })
      .eq("slug", p.slug);
    if (!error) r2++;
  }
}
console.log(`Couvertures d'articles re-hebergees : ${r2} article(s).`);
console.log(`Images sources uniques traitees : ${cache.size}.`);
console.log("Termine.");
