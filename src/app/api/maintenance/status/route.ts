import { NextResponse } from "next/server";

function isMaintenanceActive(): boolean {
  const until = Date.parse(process.env.SITE_MAINTENANCE_UNTIL ?? "");
  return (
    process.env.SITE_MAINTENANCE_ENABLED?.trim().toLowerCase() === "true" &&
    (Number.isNaN(until) || Date.now() < until)
  );
}

export function GET() {
  return NextResponse.json(
    { active: isMaintenanceActive() },
    { headers: { "Cache-Control": "no-store" } }
  );
}