import { describe, expect, it } from "vitest";
import { detectCurrency, splitCurrencyTips } from "./destination-currency";

describe("detectCurrency", () => {
  it("lit le code ISO entre parentheses", () => {
    expect(detectCurrency("Monnaie : le zloty (PLN). Environ 1 € = 4,3 PLN")).toBe("PLN");
  });
  it("reconnait une devise citee par son nom", () => {
    expect(detectCurrency("La livre sterling est la devise locale. 1 euro = 0,85 livre")).toBe("GBP");
  });
  it("ignore la zone euro", () => {
    expect(detectCurrency("Monnaie : Strasbourg utilise l'euro (EUR). 1 euro = 1,10 USD")).toBeNull();
  });
});

describe("splitCurrencyTips", () => {
  it("retire le conseil monnaie quand la devise est reconnue", () => {
    const r = splitCurrencyTips([
      "Prends le tram depuis l'aéroport.",
      "Monnaie : le zloty (PLN). Environ 1 € = 4,3 PLN (indicatif).",
    ]);
    expect(r.code).toBe("PLN");
    expect(r.rest).toEqual(["Prends le tram depuis l'aéroport."]);
  });
  it("garde le conseil quand aucune devise n'est reconnue", () => {
    const tips = ["Monnaie : on paie en pesos locaux, change à l'aéroport."];
    expect(splitCurrencyTips(tips)).toEqual({ code: null, rest: tips });
  });
  it("garde les conseils partenaires avec lien", () => {
    const tips = ["Paie sans frais de change avec [Wise](https://wise.com/fr/) (devise locale)."];
    expect(splitCurrencyTips(tips).rest).toEqual(tips);
  });
  it("ne touche pas aux fiches en zone euro", () => {
    const tips = ["Monnaie : Palerme est en zone euro, on paie en euros (EUR)."];
    expect(splitCurrencyTips(tips)).toEqual({ code: null, rest: tips });
  });
});
