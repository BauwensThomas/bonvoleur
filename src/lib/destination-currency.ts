// Monnaie d'une fiche destination, deduite des conseils deja en base : le
// conseil "Monnaie" contient le code ISO entre parentheses (ex. "(PLN)"). Le
// taux chiffre qu'il citait etait ecrit a la main et vieillissait : la page
// affiche a la place le taux du jour (voir fx.ts) avec sa date, et masque ce
// conseil. Une nouvelle destination est couverte sans rien transferer : il
// suffit que son conseil Monnaie nomme la devise.

const CODE_RE = /\(([A-Z]{3})(?:\/[A-Z]{1,4})?\)/; // "(PLN)" ou "(BAM/KM)"

// Devises citees par leur nom, sans code entre parentheses.
const NAME_TO_CODE: [RegExp, string][] = [
  [/livre sterling/i, "GBP"],
  [/dollar américain/i, "USD"],
  [/dollar canadien/i, "CAD"],
  [/rand sud-africain|\brands?\b/i, "ZAR"],
  [/real brésilien/i, "BRL"],
  [/peso argentin/i, "ARS"],
  [/peso mexicain/i, "MXN"],
  [/dirham marocain/i, "MAD"],
  [/dirham des émirats/i, "AED"],
  [/dinar algérien/i, "DZD"],
  [/dinar tunisien/i, "TND"],
  [/dram arménien/i, "AMD"],
  [/lari géorgien/i, "GEL"],
  [/lek albanais/i, "ALL"],
  [/zloty/i, "PLN"],
  [/forint/i, "HUF"],
  [/couronne tchèque/i, "CZK"],
  [/livre turque/i, "TRY"],
];

// Conseil qui parle de monnaie ou de taux (et pas un conseil partenaire :
// ceux-ci contiennent un lien Markdown).
function isCurrencyTip(tip: string): boolean {
  if (tip.includes("](")) return false;
  return (
    /monnaie|devise/i.test(tip) ||
    /1\s?(?:€|euros?)\s*(?:=|≈|équivaut|vaut|correspond)/i.test(tip) ||
    /taux de change|taux approximatif/i.test(tip)
  );
}

export function detectCurrency(tip: string): string | null {
  const code = tip.match(CODE_RE)?.[1];
  if (code === "EUR") return null; // zone euro : rien a convertir
  if (code) return code;
  for (const [re, c] of NAME_TO_CODE) if (re.test(tip)) return c;
  return null;
}

// Separe les conseils : `code` = devise detectee (null si zone euro ou inconnue),
// `rest` = conseils a afficher. Les conseils monnaie ne sont retires que si une
// devise a ete reconnue, sinon on garde le texte tel quel.
export function splitCurrencyTips(tips: string[]): { code: string | null; rest: string[] } {
  let code: string | null = null;
  const rest: string[] = [];
  for (const tip of tips) {
    if (isCurrencyTip(tip)) {
      const c = detectCurrency(tip);
      if (c) {
        code ??= c;
        continue;
      }
    }
    rest.push(tip);
  }
  return { code, rest };
}

export function currencyName(code: string): string {
  try {
    return new Intl.DisplayNames(["fr"], { type: "currency" }).of(code) ?? code;
  } catch {
    return code;
  }
}
