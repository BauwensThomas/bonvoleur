import { describe, expect, it } from "vitest";
import { detectCurrency, splitCurrencyTips } from "./destination-currency";
import { pickObservedPrice, type ObservedDeal } from "./destination-price";

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

describe("pickObservedPrice", () => {
  const now = Date.parse("2026-11-01T12:00:00Z");
  const deal = (over: Partial<ObservedDeal>): ObservedDeal => ({
    origin: "Bruxelles (BRU)",
    destination: "Nice (NCE)",
    price: 80,
    published_at: "2026-10-30T10:00:00Z",
    created_at: "2026-10-29T10:00:00Z",
    dates: "2026-12-10",
    ...over,
  });
  const active = new Set(["BRU", "CRL"]);

  it("prend le prix le plus bas et la date d'observation", () => {
    const r = pickObservedPrice([deal({ price: 120 }), deal({ price: 79.6 })], "Nice", active, now);
    expect(r).toEqual({ price: 80, origin: "Bruxelles (BRU)", seenAt: "2026-10-30T10:00:00Z" });
  });
  it("ne confond pas Nice et Nicosie", () => {
    expect(pickObservedPrice([deal({ destination: "Nicosie (LCA)" })], "Nice", active, now)).toBeNull();
  });
  it("ignore départs passés et aéroports inactifs", () => {
    const deals = [deal({ dates: "2026-10-01" }), deal({ origin: "Lyon (LYS)" })];
    expect(pickObservedPrice(deals, "Nice", active, now)).toBeNull();
  });
});
