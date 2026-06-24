import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { findOne, update } from "@/lib/db";
import { site } from "@/lib/site";
import { sendEmail } from "@/lib/email";
import { unsubscribeEmail, unsubscribeLinkEmail } from "@/lib/email-templates";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { cancelSubscriptionsAtPeriodEnd } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Désinscription",
  robots: { index: false, follow: false },
};

// Sécurité : on ne désinscrit JAMAIS sur simple saisie d'email (sinon n'importe
// qui pourrait désinscrire n'importe qui). Deux cas :
//  - email + jeton valide  -> désinscription en 1 clic (lien reçu par email).
//  - email seul (formulaire) -> on envoie le lien de confirmation à l'adresse,
//    seul le propriétaire de la boite peut alors finaliser.
type Status = "done" | "link-sent" | "invalid" | "form";

export default async function Desinscription({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const { email, token } = await searchParams;
  let status: Status = "form";

  if (email) {
    const normalized = email.trim().toLowerCase();
    const sub = await findOne("subscribers", (s) => s.email === normalized);

    if (token) {
      // Désinscription en 1 clic : le jeton doit correspondre.
      if (sub && sub.unsubscribe_token && sub.unsubscribe_token === token) {
        if (!sub.unsubscribed_at) {
          await update("subscribers", sub.id, {
            unsubscribed_at: new Date().toISOString(),
          });
          // Sécurité : on coupe aussi tout abonnement Stripe (à la fin de la
          // période payée) -> plus jamais débité après désinscription.
          if (sub.stripe_customer_id) {
            try {
              await cancelSubscriptionsAtPeriodEnd(sub.stripe_customer_id);
            } catch (err) {
              console.error("[desinscription] annulation Stripe échouée:", err);
            }
          }
          try {
            await sendEmail(unsubscribeEmail(normalized));
          } catch (err) {
            console.error("[desinscription] envoi email échoué:", err);
          }
        }
        status = "done";
      } else {
        status = "invalid";
      }
    } else {
      // Demande via le formulaire public : on envoie le lien sécurisé.
      // Message neutre dans tous les cas (on ne révèle pas si l'adresse existe).
      if (sub && sub.unsubscribe_token && !sub.unsubscribed_at) {
        try {
          await sendEmail(
            unsubscribeLinkEmail(
              normalized,
              unsubscribeUrl(normalized, sub.unsubscribe_token),
            ),
          );
        } catch (err) {
          console.error("[desinscription] envoi lien échoué:", err);
        }
      }
      status = "link-sent";
    }
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        {status === "done" && (
          <>
            <h1 className="text-2xl font-bold">Tu es bien désinscrit</h1>
            <p className="mt-3 text-slate-600">
              Tu ne recevras plus nos alertes deals. Tu peux te réinscrire à
              tout moment sur {site.domain}.
            </p>
            <p className="mt-3 text-sm text-slate-500">
              Si tu avais un abonnement premium, il a été résilié : tu ne seras
              plus débité. Tu gardes l&apos;accès premium jusqu&apos;à la fin de la
              période déjà payée.
            </p>
          </>
        )}

        {status === "link-sent" && (
          <>
            <h1 className="text-2xl font-bold">Vérifie ta boîte mail</h1>
            <p className="mt-3 text-slate-600">
              Si cette adresse est inscrite, tu vas recevoir un email avec un
              lien pour confirmer ta désinscription. C&apos;est une sécurité
              pour que personne ne puisse te désinscrire à ta place.
            </p>
          </>
        )}

        {(status === "form" || status === "invalid") && (
          <>
            <h1 className="text-2xl font-bold">Se désinscrire</h1>
            <p className="mt-3 text-slate-600">
              {status === "invalid"
                ? "Ce lien de désinscription n'est plus valide. Entre ton email, on t'en renvoie un."
                : "Entre ton email : on t'enverra un lien pour confirmer ta désinscription."}
            </p>
            <form
              method="get"
              className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
            >
              <input
                type="email"
                name="email"
                required
                placeholder="ton@email.com"
                className="rounded-lg border border-slate-300 px-3 py-2.5 sm:w-72"
              />
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
              >
                Recevoir le lien
              </button>
            </form>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
