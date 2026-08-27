import { site } from "@/lib/site";

// Egress Supabase (2026-08-27) : les routes /api/mobile/* renvoyaient les
// URLs d'image directement (Supabase Storage/Unsplash) - chaque appareil de
// l'app retelechargeait l'original a chaque appel, sans cache partage entre
// utilisateurs (meme probleme que celui corrige cote site web avec
// next/image). En passant par /_next/image (l'optimiseur Next.js du site,
// deja configure avec remotePatterns Supabase/Unsplash dans next.config.ts),
// Vercel ne va chercher l'original qu'UNE FOIS par taille puis sert son
// propre cache CDN a tous les appareils ensuite - gratuit, aucun changement
// cote app necessaire (elle continue de charger l'URL qu'on lui donne).
export function mobileImageUrl(url: string | null | undefined, width: number): string | null {
  if (!url) return null;
  const params = new URLSearchParams({ url, w: String(width), q: "75" });
  return `${site.canonicalBase}/_next/image?${params.toString()}`;
}
