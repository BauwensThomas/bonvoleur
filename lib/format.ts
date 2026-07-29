// Entier si rond (5 -> "5"), sinon 1 décimale avec virgule française (4.5 -> "4,5").
// Même règle que formatRating() côté site web (src/lib/reviews.ts).
export function formatRating(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1).replace(".", ",");
}
