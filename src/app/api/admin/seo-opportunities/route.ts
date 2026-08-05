import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { detectSeoOpportunities, groupByPageType } from "@/lib/seo-opportunities";
import { getAll } from "@/lib/db";

// Aperçu des opportunités détectées (étape 3) - pas encore de propositions
// concrètes (étape 4, table seo_suggestions). Sert à vérifier la détection et,
// plus tard, de base à l'agent qui génère les propositions.
export async function GET(req: Request) {
  const unauth = await requireAdmin(req);
  if (unauth) return unauth;

  const [opportunities, indexation] = await Promise.all([
    detectSeoOpportunities(),
    getAll("seo_indexation"),
  ]);
  const byPageType = groupByPageType(opportunities);
  const notIndexed = indexation.filter((i) => i.verdict !== "PASS");
  return NextResponse.json({
    ok: true,
    total: opportunities.length,
    byType: {
      position_opportunity: opportunities.filter((o) => o.type === "position_opportunity").length,
      low_ctr: opportunities.filter((o) => o.type === "low_ctr").length,
      regression: opportunities.filter((o) => o.type === "regression").length,
    },
    byPageType: Object.fromEntries(
      Object.entries(byPageType).map(([k, v]) => [k, v.length])
    ),
    opportunities,
    indexation: {
      checked: indexation.length,
      notIndexed: notIndexed.map((i) => ({ page: i.page, coverageState: i.coverage_state, checkedAt: i.checked_at })),
    },
  });
}
