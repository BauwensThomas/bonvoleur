// Version "texte" du bloc taux de change, pour les clients qui n'affichent que
// la liste de conseils (app mobile : /api/mobile/destinations/[slug]). Remplace
// le conseil Monnaie (taux ecrit a la main, donc perime) par une phrase au taux
// du jour avec sa date. Le site web affiche lui un bloc dedie (voir page.tsx).
import { currencyName, replaceCurrencyTips, splitCurrencyTips } from "./destination-currency";
import { formatInverse, formatRate, type FxData } from "./fx";
import { formatLongDate } from "./dates";

export function liveCurrencyTips(tips: string[], fx: FxData | null): string[] {
  const { code } = splitCurrencyTips(tips);
  const rate = code && fx ? fx.rates[code] : undefined;
  if (!code || !fx || typeof rate !== "number" || rate <= 0) return tips;
  const liveTip =
    `Monnaie : ${currencyName(code)} (${code}). 1 € = ${formatRate(rate)} ${code} ` +
    `(1 ${code} = ${formatInverse(1 / rate)} €), taux du ${formatLongDate(fx.updatedAt)}, indicatif.`;
  return replaceCurrencyTips(tips, liveTip);
}
