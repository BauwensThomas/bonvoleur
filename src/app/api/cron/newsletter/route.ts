import { NextResponse } from "next/server";
import { sendBlogNewsletter } from "@/lib/newsletter";

// Newsletter blog HEBDOMADAIRE (vendredi soir) : les 3 derniers articles.
// Planifiée dans vercel.json. Protégée par CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const result = await sendBlogNewsletter();
  return NextResponse.json(result);
}
