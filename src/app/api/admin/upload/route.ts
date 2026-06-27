import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { requireAdmin } from "@/lib/auth";

// Téléverse une image dans Supabase Storage (bucket public "photos") et renvoie
// son URL publique. Utilisé par l'admin Photos (image de secours).
export async function POST(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase non configuré." }, { status: 500 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Le fichier doit être une image." }, { status: 400 });
  }
  if (file.size > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Image trop lourde (max 6 Mo)." }, { status: 400 });
  }

  const path = `defaults/secours-${Date.now()}.webp`;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  // Crée le bucket public "photos" s'il n'existe pas (idempotent).
  await sb.storage.createBucket("photos", { public: true }).catch(() => {});
  const raw = Buffer.from(await file.arrayBuffer());

  let webp = await sharp(raw).resize({ width: 900, withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
  if (webp.byteLength > 120 * 1024) {
    webp = await sharp(raw).resize({ width: 700, withoutEnlargement: true }).webp({ quality: 60 }).toBuffer();
  }

  const { error } = await sb.storage
    .from("photos")
    .upload(path, webp, { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
  if (error) {
    // Message d'aide si le bucket n'existe pas / n'est pas accessible.
    return NextResponse.json(
      { error: `${error.message} (vérifie qu'un bucket public "photos" existe dans Supabase Storage)` },
      { status: 500 }
    );
  }
  const { data } = sb.storage.from("photos").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
