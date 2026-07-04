import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  welcomeEmail,
  confirmEmail,
  unsubscribeLinkEmail,
  unsubscribeEmail,
  accountDeletedEmail,
  dealsAlertEmail,
  blogNewsletterEmail,
} from "@/lib/email-templates";
import { dealHtml, teaserDigestHtml } from "@/lib/deal-send";
import { site } from "@/lib/site";

const TO = site.email; // contact@bonvoleur.com

const FAKE_UNSUB = `${site.url}/desinscription?email=test%40test.com&token=fake-token`;
const FAKE_CONFIRM = `${site.url}/confirmer?email=test%40test.com&token=fake-token`;
const FAKE_ACCOUNT = `${site.url}/compte`;

const FAKE_DEAL = {
  id: "test-deal-001",
  origin: "Bruxelles (BRU)",
  destination: "Lisbonne (LIS)",
  price: 89,
  normal_price: 210,
  discount_pct: 58,
  dates: "2026-09-12 / 2026-09-19",
  airline: "Ryanair",
  booking_url: "https://www.ryanair.com/fr/fr/",
  is_error_fare: false,
  is_hot: true,
  valid_until: null,
  published_at: null,
  email: { subject: "Test", body: "Test", generated_at: new Date().toISOString() },
  created_at: new Date().toISOString(),
};

const FAKE_POSTS = [
  {
    slug: "guide-vols-pas-chers-2026",
    title: "Guide complet pour trouver des vols pas chers en 2026",
    excerpt: "Toutes les astuces pour dénicher les meilleures offres : flexibilité, alertes prix, compagnies low-cost...",
    cover_image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=680&q=80",
  },
  {
    slug: "erreurs-de-prix-vols",
    title: "Les erreurs de prix : comment les repérer et en profiter",
    excerpt: "Quand les compagnies font une erreur de tarif, les chanceux qui réservent vite voyagent pour presque rien.",
    cover_image: "https://images.unsplash.com/photo-1569154941061-e231b4aa8236?w=680&q=80",
  },
  {
    slug: "10-destinations-soleil",
    title: "10 destinations soleil pas chères depuis Bruxelles ou Charleroi",
    excerpt: "Soleil garanti sans se ruiner : voici 10 destinations accessibles à moins de 150 euros aller-retour.",
    cover_image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=680&q=80",
  },
];

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const results: { name: string; ok: boolean; error?: string }[] = [];

  async function send(name: string, msg: ReturnType<typeof welcomeEmail>) {
    try {
      await sendEmail({ ...msg, to: TO });
      results.push({ name, ok: true });
    } catch (e) {
      results.push({ name, ok: false, error: String(e) });
    }
  }

  await send("1. Bienvenue", welcomeEmail(TO, FAKE_UNSUB));
  await send("2. Confirmation inscription", confirmEmail(TO, FAKE_CONFIRM));
  await send("3. Demande desinscription", unsubscribeLinkEmail(TO, FAKE_UNSUB));
  await send("4. Desinscription confirmee", unsubscribeEmail(TO));
  await send("5. Suppression de compte", accountDeletedEmail(TO));
  await send("6. Alerte stock (attention)", dealsAlertEmail(87, "attention"));
  await send("7. Alerte stock (urgence)", dealsAlertEmail(31, "urgence"));
  await send("8. Newsletter blog", blogNewsletterEmail(TO, FAKE_POSTS, FAKE_UNSUB));

  // Deal unique
  try {
    await sendEmail({
      to: TO,
      subject: `Bruxelles (BRU) -> Lisbonne (LIS) aux alentours de 89 EUR A/R`,
      html: dealHtml(FAKE_DEAL, FAKE_UNSUB),
      text: "Test deal email",
      replyTo: site.email,
      listUnsubscribe: FAKE_UNSUB,
    });
    results.push({ name: "9. Deal unique", ok: true });
  } catch (e) {
    results.push({ name: "9. Deal unique", ok: false, error: String(e) });
  }

  // Digest teaser PREMIUM
  try {
    await sendEmail({
      to: TO,
      subject: "Tes bons plans de vols Premium - BonVoleur",
      html: teaserDigestHtml(
        [{ origin: "Bruxelles (BRU)", deals: [FAKE_DEAL] }],
        FAKE_ACCOUNT,
        FAKE_UNSUB,
      ),
      text: "Test digest premium",
      replyTo: site.email,
      listUnsubscribe: FAKE_UNSUB,
    });
    results.push({ name: "10. Digest PREMIUM", ok: true });
  } catch (e) {
    results.push({ name: "10. Digest PREMIUM", ok: false, error: String(e) });
  }

  // Digest teaser Freemium
  try {
    await sendEmail({
      to: TO,
      subject: "Tes bons plans de vols Freemium - BonVoleur",
      html: teaserDigestHtml(
        [{ origin: "Paris CDG (CDG)", deals: [{ ...FAKE_DEAL, id: "test-deal-002", origin: "Paris CDG (CDG)", price: 74, airline: "Transavia" }] }],
        FAKE_ACCOUNT,
        FAKE_UNSUB,
      ),
      text: "Test digest freemium",
      replyTo: site.email,
      listUnsubscribe: FAKE_UNSUB,
    });
    results.push({ name: "11. Digest Freemium", ok: true });
  } catch (e) {
    results.push({ name: "11. Digest Freemium", ok: false, error: String(e) });
  }

  const allOk = results.every((r) => r.ok);
  return NextResponse.json({ ok: allOk, sent: TO, results });
}
