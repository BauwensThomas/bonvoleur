import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Déconnexion : efface la session Supabase (cookies) puis renvoie à l'accueil.
export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
