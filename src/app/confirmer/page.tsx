import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { findOne, update } from "@/lib/db";
import { site } from "@/lib/site";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";
import { unsubscribeUrl } from "@/lib/unsubscribe";

export const metadata: Metadata = {
  title: "Confirmation d'inscription",
  robots: { index: false, follow: false },
};

// Double opt-in : on n'active l'abonné (consent_at daté) qu'ici, après clic
// sur le lien reçu par email, avec le jeton qui correspond.
type Status = "confirmed" | "already" | "invalid";

export default async function Confirmer({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;
  let status: Status = "invalid";

  if (email && token) {
    const normalized = email.trim().toLowerCase();
    const sub = await findOne("subscribers", (s) => s.email === normalized);
    if (sub && sub.unsubscribe_token && sub.unsubscribe_token === token) {
      if (sub.consent_at) {
        status = "already";
      } else {
        await update("subscribers", sub.id, {
          consent_at: new Date().toISOString(),
        });
        try {
          await sendEmail(
            welcomeEmail(normalized, unsubscribeUrl(normalized, token))
          );
        } catch (err) {
          console.error("[confirmer] envoi bienvenue échoué:", err);
        }
        status = "confirmed";
      }
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        {status === "confirmed" && (
          <>
            <h1 className="text-2xl font-bold">Inscription confirmée</h1>
            <p className="mt-3 text-slate-600">
              C&apos;est tout bon. Tu vas maintenant recevoir nos bons plans de
              vols. À très vite sur {site.domain}.
            </p>
          </>
        )}
        {status === "already" && (
          <>
            <h1 className="text-2xl font-bold">Déjà confirmé</h1>
            <p className="mt-3 text-slate-600">
              Ton inscription était déjà active. Rien à faire de plus.
            </p>
          </>
        )}
        {status === "invalid" && (
          <>
            <h1 className="text-2xl font-bold">Lien invalide</h1>
            <p className="mt-3 text-slate-600">
              Ce lien de confirmation n&apos;est pas valide ou a expiré. Tu peux
              te réinscrire sur la page d&apos;accueil.
            </p>
            <Link
              href="/#inscription"
              className="mt-5 inline-block rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
            >
              S&apos;inscrire
            </Link>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
