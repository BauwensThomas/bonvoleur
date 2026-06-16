import { getAll } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const unauth = await requireAdmin();
  if (unauth) return unauth;
  const rows = await getAll("subscribers");
  const header = [
    "email",
    "tier",
    "home_airports",
    "consent_at",
    "unsubscribed_at",
    "created_at",
  ];
  const lines = rows.map((r) =>
    [
      r.email,
      r.tier,
      (r.home_airports ?? []).join(" "),
      r.consent_at ?? "",
      r.unsubscribed_at ?? "",
      r.created_at,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [header.join(","), ...lines].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="abonnes-bonvoleur-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  });
}
