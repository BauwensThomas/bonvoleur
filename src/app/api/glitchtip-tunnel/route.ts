import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const dsn = new URL(process.env.NEXT_PUBLIC_SENTRY_DSN!);
  const projectId = dsn.pathname.replace("/", "");
  const url = `${dsn.protocol}//${dsn.host}/api/${projectId}/envelope/`;

  const body = await req.text();
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body,
  });

  return NextResponse.json({ status: "ok" });
}
