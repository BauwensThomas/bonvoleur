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
