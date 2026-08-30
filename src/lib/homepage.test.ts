import { describe, it, expect, vi, beforeEach } from "vitest";

// unstable_cache exige le runtime serveur Next.js ("incrementalCache") - non
// disponible sous Vitest. Neutralisé en pass-through (comme "server-only"),
// voir memoire project_conventions_techniques (2026-08-13).
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("./db", () => ({ getAll: vi.fn(), getPublicFreshDeals: vi.fn() }));

import { getPublicFreshDeals } from "./db";
import { getHomepageDeals } from "./homepage";

const HOUR = 3600 * 1000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

function deal(over: Record<string, unknown>) {
  return {
    id: Math.random().toString(36).slice(2),
    origin: "Bruxelles (BRU)",
    destination: "Lisbonne (LIS)",
    price: 80,
    normal_price: 150,
    dates: "octobre",
    airline: "TAP",
    booking_url: "https://x",
    is_hot: true,
    created_at: iso(10 * HOUR),
    published_at: iso(1 * HOUR),
    ...over,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("getHomepageDeals — vitrine teaser", () => {
  it("limite à 3 cartes, dédoublonnées par route", async () => {
    vi.mocked(getPublicFreshDeals).mockResolvedValue([
      deal({ destination: "Lisbonne (LIS)", created_at: iso(2 * HOUR) }),
      deal({ destination: "Lisbonne (LIS)", created_at: iso(50 * HOUR) }), // doublon route
      deal({ destination: "Barcelone (BCN)" }),
      deal({ destination: "Athènes (ATH)" }),
      deal({ destination: "Rome (FCO)" }),
    ] as never);
    const { teaserDeals } = await getHomepageDeals();
    expect(teaserDeals).toHaveLength(3);
  });

  it("n'expose que route + prix (aucune info actionnable)", async () => {
    vi.mocked(getPublicFreshDeals).mockResolvedValue([deal({})] as never);
    const { teaserDeals } = await getHomepageDeals();
    expect(Object.keys(teaserDeals![0]).sort()).toEqual([
      "destination",
      "origin",
      "price",
    ]);
  });

  it("renvoie null s'il n'y a aucun bon plan", async () => {
    vi.mocked(getPublicFreshDeals).mockResolvedValue([] as never);
    const { teaserDeals } = await getHomepageDeals();
    expect(teaserDeals).toBeNull();
  });

  it("ignore les deals non hot", async () => {
    vi.mocked(getPublicFreshDeals).mockResolvedValue([
      deal({ destination: "Rome (FCO)", is_hot: false }),
    ] as never);
    const { teaserDeals } = await getHomepageDeals();
    expect(teaserDeals).toBeNull();
  });
});
