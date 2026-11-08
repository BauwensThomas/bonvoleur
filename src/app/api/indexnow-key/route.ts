// Fichier de verification IndexNow : servi sur /<INDEXNOW_KEY>.txt grace a la
// reecriture declaree dans next.config.ts. Contenu = la cle, en texte brut.
export const dynamic = "force-static";

export function GET() {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
