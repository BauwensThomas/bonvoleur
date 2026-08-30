import { NextResponse } from "next/server";
import { getAll, insert, update, remove } from "@/lib/db";
import { discountPct } from "@/lib/site";
import { requireAdmin } from "@/lib/auth";
import { runDealWriter } from "@/lib/deal-writer";
import { revalidateTag } from "next/cache";

export async function GET() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const rows = await getAll("deals");
  rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const b = await req.json();
  if (!b.origin || !b.destination || !b.price || !b.booking_url) {
    return NextResponse.json(
      { error: "Origine, destination, prix et lien requis." },
      { status: 400 }
    );
  }
  const price = Number(b.price);
  const normal = b.normal_price ? Number(b.normal_price) : null;
  const row = await insert("deals", {
    origin: b.origin,
    destination: b.destination,
    price,
    normal_price: normal,
    discount_pct: normal ? discountPct(price, normal) : null,
    dates: b.dates ?? "",
    airline: b.airline ?? null,
    booking_url: b.booking_url,
    is_error_fare: b.is_error_fare ?? false,
    is_hot: b.is_hot ?? true, // un deal saisi à la main est un vrai bon plan
    valid_until: b.valid_until ?? null,
    published_at: b.published_at ?? null,
    email: null,
  });

  // Automatisation : génère l'email du deal dès sa création (deal-writer).
  // Tolérant aux pannes : l'échec est journalisé mais ne bloque pas la création.
  await runDealWriter(row.id, "auto");
  revalidateTag("deals-public", "max");
  const withEmail = (await getAll("deals")).find((d) => d.id === row.id) ?? row;
  return NextResponse.json(withEmail, { status: 201 });
}

export async function PUT(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const b = await req.json();
  if (!b.id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  const { id, ...patch } = b;
  if (patch.price && patch.normal_price) {
    patch.discount_pct = discountPct(Number(patch.price), Number(patch.normal_price));
  }
  const row = await update("deals", id, patch);
  if (!row) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  // Si on a modifié la route/prix/dates, on régénère l'email automatiquement.
  const touchesEmail = ["origin", "destination", "price", "normal_price", "dates", "airline", "booking_url", "is_error_fare"].some((k) => k in patch);
  if (touchesEmail) {
    await runDealWriter(id, "auto");
    revalidateTag("deals-public", "max");
    const fresh = await getAll("deals");
    return NextResponse.json(fresh.find((d) => d.id === id) ?? row);
  }
  revalidateTag("deals-public", "max");
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });
  const ok = await remove("deals", id);
  if (ok) revalidateTag("deals-public", "max");
  return NextResponse.json({ ok });
}
