import { requireAdmin } from "@/lib/auth";
import { getById } from "@/lib/db";
import { dealHtml } from "@/lib/deal-send";
import type { Deal } from "@/lib/types";

// Aperçu HTML de l'email d'un deal. ?id=<dealId> pour un deal réel,
// sinon un exemple. Rendu directement en HTML pour visualiser le design.
const sample: Deal = {
  id: "sample",
  origin: "Bruxelles (BRU)",
  destination: "Barcelone (BCN)",
  price: 41,
  normal_price: 120,
  discount_pct: 66,
  dates: "2026-06-23 au 2026-06-25",
  airline: "FR",
  booking_url: "https://www.aviasales.com/",
  is_error_fare: false,
  is_hot: true,
  valid_until: null,
  published_at: null,
  email: null,
  created_at: new Date().toISOString(),
};

export async function GET(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;

  const id = new URL(req.url).searchParams.get("id");
  const deal = (id && (await getById("deals", id))) || sample;

  return new Response(dealHtml(deal, "#"), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
