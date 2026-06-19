import { describe, it, expect } from "vitest";
import { discountPct } from "./site";

describe("discountPct", () => {
  it("calcule le pourcentage de réduction arrondi", () => {
    expect(discountPct(50, 100)).toBe(50);
    expect(discountPct(79, 180)).toBe(56);
    expect(discountPct(90, 100)).toBe(10);
  });

  it("renvoie 0 si le prix normal est absent ou invalide", () => {
    expect(discountPct(50, 0)).toBe(0);
    expect(discountPct(50, -10)).toBe(0);
  });
});
