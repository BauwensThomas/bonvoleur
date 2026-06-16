import { NextResponse } from "next/server";
import { insert, findOne } from "@/lib/db";
import { discountPct } from "@/lib/site";
import { runDealWriter } from "@/lib/deal-writer";
import { sendDealAuto } from "@/lib/deal-send";

// Point d'entrée pour une SOURCE EXTERNE de deals (ex. script Python H24).
// La source est responsable de : trouver le deal ET vérifier que le lien est
// encore accessible (surtout pour une erreur de prix) AVANT d'appeler ici.
//
// Flux automatique : crée le deal -> Deal Writer génère l'email ->
// envoi aux abonnés ciblés (aéroport = origine). Tout sans intervention.
//
// Protégé par INGEST_SECRET (en-tête Authorization: Bearer <secret>).
export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "INGEST_SECRET non configuré côté serveur." },
      { status: 503 }
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const origin = String(b.origin ?? "");
  const destination = String(b.destination ?? "");
  const price = Number(b.price);
  const bookingUrl = String(b.booking_url ?? "");
  if (!origin || !destination || !price || !bookingUrl) {
    return NextResponse.json(
      { error: "origin, destination, price et booking_url requis." },
      { status: 400 }
    );
  }

  const normal = b.normal_price ? Number(b.normal_price) : null;
  const autosend = b.autosend !== false; // par défaut : envoi automatique

  // Dédoublonnage : si un deal avec le même lien existe déjà, on ne refait rien.
  const existing = await findOne("deals", (d) => d.booking_url === bookingUrl);
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true, dealId: existing.id });
  }

  const deal = await insert("deals", {
    origin,
    destination,
    price,
    normal_price: normal,
    discount_pct: normal ? discountPct(price, normal) : null,
    dates: String(b.dates ?? ""),
    airline: b.airline ? String(b.airline) : null,
    booking_url: bookingUrl,
    is_error_fare: Boolean(b.is_error_fare),
    is_hot: b.is_hot !== false, // vrai bon plan (defaut true si non précisé)
    valid_until: b.valid_until ? String(b.valid_until) : null,
    published_at: null,
    email: null,
  });

  // 1) Génère l'email (Deal Writer)
  await runDealWriter(deal.id, "auto");

  // 2) Envoie aux abonnés ciblés (si autosend)
  let send = null;
  if (autosend) {
    send = await sendDealAuto(deal.id);
  }

  return NextResponse.json({ ok: true, dealId: deal.id, autosend, send });
}
