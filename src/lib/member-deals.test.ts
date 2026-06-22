import { describe, it, expect, vi, beforeEach } from "vitest";

// On isole la logique de gating : la couche DB est mockée.
vi.mock("./db", () => ({ getAll: vi.fn() }));

import { getAll } from "./db";
import { getMemberDeals, FREE_MAX_DEALS, FREE_DELAY_HOURS } from "./member-deals";

const HOUR = 3600 * 1000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

// Fabrique un deal minimal avec les champs utilisés par le gating.
function deal(over: Record<string, unknown>) {
  return {
    id: Math.random().toString(36).slice(2),
    origin: "Bruxelles (BRU)",
    destination: "Lisbonne (LIS)",
    price: 80,
    normal_price: null,
    dates: "",
    airline: null,
    booking_url: "https://x",
    is_hot: true,
    created_at: iso(100 * HOUR),
    published_at: iso(1 * HOUR),
    ...over,
  };
}

function mockDeals(deals: unknown[]) {
  vi.mocked(getAll).mockResolvedValue(deals as never);
}

beforeEach(() => vi.clearAllMocks());

describe("getMemberDeals — gating par tier", () => {
  it("premium voit toutes les routes (une par route, la plus récente)", async () => {
    mockDeals([
      deal({ destination: "Lisbonne (LIS)", created_at: iso(50 * HOUR) }),
      deal({ destination: "Lisbonne (LIS)", created_at: iso(10 * HOUR) }), // doublon de route
      deal({ destination: "Barcelone (BCN)" }),
    ]);
    const { deals, total } = await getMemberDeals("premium");
    expect(total).toBe(2); // 2 routes uniques
    expect(deals).toHaveLength(2);
  });

  it("masque les deals non revus depuis plus de 5 jours (premium)", async () => {
    mockDeals([
      deal({ destination: "Lisbonne (LIS)", published_at: iso(2 * HOUR) }), // frais
      deal({
        destination: "Barcelone (BCN)",
        published_at: iso(8 * 24 * HOUR), // vu il y a 8 jours -> masqué
        created_at: iso(8 * 24 * HOUR),
      }),
    ]);
    const { deals, total } = await getMemberDeals("premium");
    expect(total).toBe(1);
    expect(deals[0].destination).toBe("Lisbonne (LIS)");
  });

  it("gratuit ne voit que les deals découverts il y a >= FREE_DELAY_HOURS", async () => {
    mockDeals([
      deal({ destination: "Lisbonne (LIS)", created_at: iso(120 * HOUR) }), // ancien -> visible
      deal({ destination: "Barcelone (BCN)", created_at: iso(10 * HOUR) }), // récent -> caché
    ]);
    const { deals } = await getMemberDeals("free");
    expect(deals).toHaveLength(1);
    expect(deals[0].destination).toBe("Lisbonne (LIS)");
  });

  it("gratuit est plafonné à FREE_MAX_DEALS", async () => {
    const old = (dest: string) =>
      deal({ destination: dest, created_at: iso(200 * HOUR) });
    mockDeals([
      old("A"), old("B"), old("C"), old("D"),
      old("E"), old("F"), old("G"), old("H"),
    ]);
    const { deals } = await getMemberDeals("free");
    expect(deals).toHaveLength(FREE_MAX_DEALS);
  });

  it("le seuil gratuit vaut bien 96h (4 jours)", () => {
    expect(FREE_DELAY_HOURS).toBe(96);
  });

  it("liveLockedForFree = routes premium non visibles par le gratuit", async () => {
    mockDeals([
      deal({ destination: "Lisbonne (LIS)", created_at: iso(120 * HOUR) }), // gratuit OK
      deal({ destination: "Barcelone (BCN)", created_at: iso(10 * HOUR) }), // premium seulement
    ]);
    const { total, liveLockedForFree } = await getMemberDeals("free");
    expect(total).toBe(2);
    expect(liveLockedForFree).toBe(1);
  });

  it("lastRefresh = date 'vu' la plus récente", async () => {
    mockDeals([
      deal({ destination: "Lisbonne (LIS)", published_at: iso(5 * HOUR) }),
      deal({ destination: "Barcelone (BCN)", published_at: iso(1 * HOUR) }),
    ]);
    const { lastRefresh } = await getMemberDeals("premium");
    // le plus récent est celui vu il y a 1h
    expect(lastRefresh).not.toBeNull();
    expect(new Date(lastRefresh!).getTime()).toBeGreaterThan(
      Date.now() - 2 * HOUR,
    );
  });
});
