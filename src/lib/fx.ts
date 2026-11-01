// Taux de change du jour (EUR vers devises). Deux usages :
// - fiches destination : taux affiche avec sa date, jamais ecrit a la main ;
// - articles generes : sans ca, le modele recopie des taux de memoire (constate
//   le 2026-11-01 : livre turque citee a 44-48 pour 1 EUR, reel 55,8 ; dollar
//   canadien a 1,08, reel 1,56).
// Source gratuite sans cle, mise a jour quotidienne.
import { unstable_cache } from "next/cache";

export interface FxData {
  rates: Record<string, number>;
  updatedAt: string; // ISO, date de mise a jour du fournisseur
}

const FX_CURRENCIES = [
  "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "AED", "THB",
  "MAD", "TND", "EGP", "MUR", "TRY",
  "PLN", "CZK", "HUF", "RON", "BGN", "DKK", "SEK", "NOK", "ISK",
  "ALL", "GEL", "AMD", "RSD", "MKD",
];

// Leve une erreur en cas d'echec : unstable_cache ne met pas en cache une
// exception, donc un incident passager ne fige pas "pas de taux" pendant 6 h.
async function fetchFx(): Promise<FxData> {
  const res = await fetch("https://open.er-api.com/v6/latest/EUR", {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`fx HTTP ${res.status}`);
  const data = (await res.json()) as {
    result?: string;
    rates?: Record<string, number>;
    time_last_update_unix?: number;
  };
  if (data.result !== "success" || !data.rates) throw new Error("fx reponse invalide");
  const updatedAt = data.time_last_update_unix
    ? new Date(data.time_last_update_unix * 1000).toISOString()
    : new Date().toISOString();
  return { rates: data.rates, updatedAt };
}

const getCachedFx = unstable_cache(fetchFx, ["fx-eur"], { revalidate: 6 * 60 * 60 });

export async function getFx(): Promise<FxData | null> {
  try {
    return await getCachedFx();
  } catch {
    return null;
  }
}

export function formatRate(value: number): string {
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return value.toLocaleString("fr-FR", { maximumFractionDigits: digits });
}

export function formatInverse(value: number): string {
  return value.toLocaleString("fr-FR", { maximumSignificantDigits: 2 });
}

// Une ligne par devise ("1 € = 55,8 TRY"), ou "" si le service est
// indisponible (l'article doit alors eviter tout chiffre de change).
export async function getFxPromptLines(): Promise<string> {
  const fx = await getFx();
  if (!fx) return "";
  return FX_CURRENCIES.filter((c) => typeof fx.rates[c] === "number")
    .map((c) => `1 € = ${formatRate(fx.rates[c])} ${c}`)
    .join("\n");
}
