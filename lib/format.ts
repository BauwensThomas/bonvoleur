// Entier si rond (5 -> "5"), sinon 1 décimale avec virgule française (4.5 -> "4,5").
// Même règle que formatRating() côté site web (src/lib/reviews.ts).
export function formatRating(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1).replace(".", ",");
}

// Le champ "dates" des deals vient du scanner au format "YYYY-MM-DD" ou
// "YYYY-MM-DD au YYYY-MM-DD". Même règle que formatDealDates() côté site web
// (src/lib/dates.ts) : convertit chaque date ISO trouvée en JJ/MM/AAAA.
export function formatDealDates(raw: string): string {
  return raw.replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3/$2/$1");
}

// Date + heure de détection ("Déniché le 12 août à 14:32"). Même règle que
// detectedAt() côté site web (src/app/compte/page.tsx).
export function detectedAt(iso: string): string {
  return new Date(iso).toLocaleString("fr-BE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Date d'article, relative jusqu'à 7 jours puis absolue courte - même règle
// que formatArticleDate() côté site web (src/lib/dates.ts). Utilisé sur la
// liste du blog et les cartes "À lire aussi".
export function formatArticleDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays <= 7) return `il y a ${diffDays} jours`;
  return new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
}

// Date d'article, toujours absolue et complète ("12 juillet 2026") - même
// règle que la page d'article côté site web (src/app/blog/[slug]/page.tsx).
export function formatArticleDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
}
