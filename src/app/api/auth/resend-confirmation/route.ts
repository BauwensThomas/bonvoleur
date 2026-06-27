import { NextResponse } from "next/server";
import { getMemberState } from "@/lib/member-auth";
import { findOne } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { confirmEmail } from "@/lib/email-templates";
import { confirmUrl } from "@/lib/unsubscribe";
import { allow } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

// Renvoie l'email de confirmation (double opt-in) UNIQUEMENT pour l'email de la
// session en cours, et seulement s'il n'est pas déjà confirmé. Pas d'email en
// paramètre -> pas d'abus possible. Limité par IP.
export async function POST(req: Request) {
  const state = await getMemberState();
  if (state.status !== "unconfirmed") {
    return NextResponse.redirect(new URL("/compte", req.url), { status: 303 });
  }

  // Anti-spam : limite par IP (3/min) ET délai par compte (1 renvoi / 2 min)
  // pour ne pas inonder la boîte mail de la personne.
  const ip = getClientIp(req);
  const ipOk = await allow("resend-confirm-ip", ip, { windowMs: 60 * 1000, max: 3 });
  const emailOk = await allow("resend-confirm-email", state.email, {
    windowMs: 2 * 60 * 1000,
    max: 1,
  });
  if (!ipOk || !emailOk) {
    return NextResponse.redirect(new URL("/compte?resend=rate", req.url), {
      status: 303,
    });
  }

  const sub = await findOne(
    "subscribers",
    (s) => s.email.toLowerCase() === state.email
  );
  if (sub && !sub.consent_at && !sub.unsubscribed_at) {
    try {
      await sendEmail(
        confirmEmail(sub.email, confirmUrl(sub.email, sub.unsubscribe_token))
      );
    } catch (err) {
      console.error("[resend-confirmation] envoi échoué:", err);
    }
  }

  return NextResponse.redirect(new URL("/compte?resend=ok", req.url), {
    status: 303,
  });
}
