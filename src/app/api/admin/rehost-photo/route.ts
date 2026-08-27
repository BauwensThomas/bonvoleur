import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import sharp from "sharp";

function slugify(s: string): string {
  return String(s)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Télécharge une image distante, la compresse si Unsplash, l'uploade dans
// Supabase Storage et retourne l'URL publique hébergée.
export async function POST(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const body = await req.json().catch(() => ({}));
  const sourceUrl: string = body.url ?? "";
  const destCity: string = body.dest_city ?? "";
  const slot: number = Number(body.slot ?? 0); // 0 = bannière, 1-4 = galerie
  if (!sourceUrl || !destCity) {
    return NextResponse.json({ error: "url et dest_city requis." }, { status: 400 });
  }

  // Déjà hébergé chez nous -> rien à faire.
  if (sourceUrl.includes("/storage/v1/object/public/photos/")) {
    return NextResponse.json({ url: sourceUrl });
  }

  const sbUrl = process.env.SUPABASE_URL!;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!sbUrl || !sbKey) {
    return NextResponse.json({ error: "Supabase non configuré." }, { status: 500 });
  }

  const base = sourceUrl.split("?")[0];
  const fetchUrl = /(images|plus)\.unsplash\.com/.test(sourceUrl)
    ? `${base}?auto=format&fit=max&w=1200&q=68&fm=jpg`
    : sourceUrl;

  try {
    const r = await fetch(fetchUrl, { headers: { "User-Agent": "Mozilla/5.0 BonVoleur" } });
    if (!r.ok) return NextResponse.json({ error: `Téléchargement échoué (${r.status}).` }, { status: 502 });
    const raw = Buffer.from(await r.arrayBuffer());
    if (raw.byteLength === 0) return NextResponse.json({ error: "Image vide." }, { status: 502 });

    let compressed: Buffer = raw;
    for (const width of [1000, 800]) {
      for (const q of [75, 60, 45, 35]) {
        compressed = await sharp(raw)
          .resize({ width, withoutEnlargement: true })
          .jpeg({ quality: q, mozjpeg: true })
          .toBuffer();
        if (compressed.byteLength <= 100 * 1024) break;
      }
      if (compressed.byteLength <= 100 * 1024) break;
    }

    const buf = new Uint8Array(compressed);
    const sb = createClient(sbUrl, sbKey, { auth: { persistSession: false } });
    const citySlug = slugify(destCity);
    const name = slot === 0 ? citySlug : `${citySlug}-gallery-${slot}`;
    const path = `destinations/${name}.jpg`;

    const { error } = await sb.storage
      .from("photos")
      .upload(path, buf, { contentType: "image/jpeg", upsert: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data } = sb.storage.from("photos").getPublicUrl(path);
    // Chemin stable (upsert) + cache long cote optimiseur d'images (voir
    // next.config.ts) : sans ce ?v=, remplacer une photo existante servirait
    // l'ancienne version depuis le cache CDN pendant toute la duree du TTL.
    // Meme pattern deja utilise par rehost.ts (content-publisher).
    return NextResponse.json({ url: `${data.publicUrl}?v=${Date.now()}` });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
