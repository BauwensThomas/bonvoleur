import { describe, it, expect, vi, beforeEach } from "vitest";

// "server-only" bloque l'import même sous l'environnement "node" de Vitest
// (résolution de conditions de package, pas un vrai check runtime) - neutralisé
// ici comme le ferait un bundler Next.js côté serveur.
vi.mock("server-only", () => ({}));
vi.mock("./db", () => ({ getAll: vi.fn() }));

import { getAll } from "./db";
import { detectSeoOpportunities, classifyPage } from "./seo-opportunities";
import type { SeoGscDaily } from "./types";

const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

function row(over: Partial<SeoGscDaily>): SeoGscDaily {
  return {
    id: Math.random().toString(36).slice(2),
    site: "bonvoleur.com",
    date: daysAgo(1),
    page: "https://www.bonvoleur.com/vols-pas-chers/bangkok",
    query: "vol pas cher bangkok",
    clicks: 0,
    impressions: 10,
    ctr: 0,
    position: 10,
    fetched_at: new Date().toISOString(),
    ...over,
  };
}

function mockRows(rows: SeoGscDaily[]) {
  vi.mocked(getAll).mockResolvedValue(rows as never);
}

beforeEach(() => vi.clearAllMocks());

describe("classifyPage", () => {
  it("distingue accueil, destinations, blog, listings", () => {
    expect(classifyPage("https://www.bonvoleur.com/")).toBe("home");
    expect(classifyPage("https://www.bonvoleur.com/vols-pas-chers")).toBe("destination-listing");
    expect(classifyPage("https://www.bonvoleur.com/vols-pas-chers/bangkok")).toBe("destination");
    expect(classifyPage("https://www.bonvoleur.com/blog")).toBe("blog-listing");
    expect(classifyPage("https://www.bonvoleur.com/blog/mon-article")).toBe("blog-article");
    expect(classifyPage("https://www.bonvoleur.com/confidentialite")).toBe("other");
  });
});

describe("detectSeoOpportunities", () => {
  it("détecte une opportunité de position (8-20, assez d'impressions)", async () => {
    mockRows([row({ position: 12, impressions: 20, clicks: 1 })]);
    const opps = await detectSeoOpportunities();
    expect(opps.some((o) => o.type === "position_opportunity")).toBe(true);
  });

  it("ignore une position 8-20 avec trop peu d'impressions", async () => {
    mockRows([row({ position: 12, impressions: 2, clicks: 0 })]);
    const opps = await detectSeoOpportunities();
    expect(opps.some((o) => o.type === "position_opportunity")).toBe(false);
  });

  it("ignore une bonne position (top 5) même avec beaucoup d'impressions", async () => {
    mockRows([row({ position: 3, impressions: 100, clicks: 20 })]);
    const opps = await detectSeoOpportunities();
    expect(opps.some((o) => o.type === "position_opportunity")).toBe(false);
  });

  it("détecte un CTR faible (beaucoup d'impressions, quasi aucun clic)", async () => {
    mockRows([row({ position: 4, impressions: 200, clicks: 1 })]); // ctr 0.5%, attendu ~5% en position 4
    const opps = await detectSeoOpportunities();
    expect(opps.some((o) => o.type === "low_ctr")).toBe(true);
  });

  it("ne signale pas un CTR faible si trop peu d'impressions", async () => {
    mockRows([row({ position: 4, impressions: 5, clicks: 0 })]);
    const opps = await detectSeoOpportunities();
    expect(opps.some((o) => o.type === "low_ctr")).toBe(false);
  });

  it("détecte une régression semaine sur semaine", async () => {
    const page = "https://www.bonvoleur.com/vols-pas-chers/tokyo";
    mockRows([
      // Semaine précédente (jours 8-14) : bon volume.
      row({ page, date: daysAgo(10), clicks: 20, impressions: 200 }),
      // Semaine courante (jours 1-7) : chute nette.
      row({ page, date: daysAgo(2), clicks: 2, impressions: 200 }),
    ]);
    const opps = await detectSeoOpportunities();
    const regression = opps.find((o) => o.type === "regression");
    expect(regression).toBeDefined();
    if (regression?.type === "regression") {
      expect(regression.clicksPrevious).toBe(20);
      expect(regression.clicksCurrent).toBe(2);
    }
  });

  it("ne signale pas de régression sous le seuil minimum de clics précédents", async () => {
    const page = "https://www.bonvoleur.com/vols-pas-chers/oslo";
    mockRows([
      row({ page, date: daysAgo(10), clicks: 2, impressions: 50 }),
      row({ page, date: daysAgo(2), clicks: 0, impressions: 50 }),
    ]);
    const opps = await detectSeoOpportunities();
    expect(opps.some((o) => o.type === "regression")).toBe(false);
  });

  it("renvoie un tableau vide sans données", async () => {
    mockRows([]);
    const opps = await detectSeoOpportunities();
    expect(opps).toEqual([]);
  });
});
