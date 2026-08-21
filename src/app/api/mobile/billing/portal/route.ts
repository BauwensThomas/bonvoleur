import { NextResponse } from "next/server";
import { getMobileMemberState } from "@/lib/mobile-auth";
import { withCors, corsPreflight } from "@/lib/mobile-cors";
import { stripe } from "@/lib/stripe";
import { site } from "@/lib/site";
import { trackMobileRequest } from "@/lib/request-track";

export const OPTIONS = corsPreflight;

// Équivalent mobile de POST /api/billing/portal (web) : ouvre le portail de
// facturation Stripe (gestion/annulation/factures). Authentifié par jeton
// bearer, renvoie l'URL en JSON pour que l'app l'ouvre dans le navigateur.
export async function POST(req: Request) {
  trackMobileRequest("/api/mobile/billing/portal");
  const state = await getMobileMemberState(req);
  if (state.status !== "member" || !state.subscriber.stripe_customer_id) {
    return withCors(NextResponse.json({ error: "Non autorisé" }, { status: 401 }));
  }

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: state.subscriber.stripe_customer_id,
      return_url: `${site.canonicalBase}/compte`,
      ...(process.env.STRIPE_PORTAL_CONFIG_ID
        ? { configuration: process.env.STRIPE_PORTAL_CONFIG_ID }
        : {}),
    });
    return withCors(NextResponse.json({ url: session.url }));
  } catch (e) {
    // Une exception non attrapée ici renvoie un 500 Next.js SANS en-têtes
    // CORS (withCors() jamais atteint) - le navigateur l'affiche alors comme
    // une erreur CORS, masquant la vraie cause. On l'attrape pour renvoyer un
    // message exploitable (ex. configuration du portail Stripe manquante).
    console.error("[mobile billing portal]", e);
    return withCors(
      NextResponse.json({ error: "Le portail de facturation n'a pas pu s'ouvrir." }, { status: 500 })
    );
  }
}
