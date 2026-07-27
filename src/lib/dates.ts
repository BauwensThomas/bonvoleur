// Date d'article : relatif ("il y a 3 jours") jusqu'à 7 jours, puis date
// absolue au-delà. Utilisé sur la homepage et la page /blog.
export function formatArticleDate(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays <= 7) return `il y a ${diffDays} jours`;
  return new Date(iso).toLocaleDateString("fr-BE", { day: "numeric", month: "short", year: "numeric" });
}

// Le champ "dates" des deals vient du scanner au format "YYYY-MM-DD" ou
// "YYYY-MM-DD au YYYY-MM-DD". On convertit chaque date ISO trouvée en
// JJ/MM/AAAA sans toucher au reste de la chaîne (séparateur " au ", etc.).
export function formatDealDates(raw: string): string {
  return raw.replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3/$2/$1");
}
