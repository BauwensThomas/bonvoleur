import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { findOne } from "@/lib/db";
import { site } from "@/lib/site";
import { sendEmail } from "@/lib/email";
import { unsubscribeLinkEmail } from "@/lib/email-templates";
import { unsubscribeUrl } from "@/lib/unsubscribe";

export const metadata: Metadata = {
  title: "Désinscription",
  robots: { index: false, follow: false },
};

// Sécurité : on ne supprime JAMAIS sur un simple chargement de lien (GET) — les
// clients/scanners d'emails préchargent les liens. Le clic sur le lien affiche
// une page de CONFIRMATION ; la suppression réelle se fait par POST vers
// /api/unsubscribe (jeton vérifié). Et on ne désinscrit jamais sur simple saisie
// d'email (sinon n'importe qui pourrait supprimer n'importe qui) : on envoie le
// lien sécurisé au propriétaire de la boîte.
type Status = "done" | "confirm" | "invalid" | "link-sent" | "form";

export default async function Desinscription({
  searchParams,
}: {
  searchParams: Promise<{
    email?: string;
    token?: string;
    done?: string;
    invalid?: string;
  }>;
}) {
  const { email, token, done, invalid } = await searchParams;
  let status: Status = "form";

  if (done === "1") {
    status = "done";
  } else if (invalid === "1") {
    status = "invalid";
  } else if (email && token) {
    // Lien reçu par email : on AFFICHE la confirmation (pas de suppression ici).
    status = "confirm";
  } else if (email) {
    // Formulaire public : on envoie le lien sécurisé. Message neutre dans tous
    // les cas (on ne révèle pas si l'adresse existe).
    const normalized = email.trim().toLowerCase();
    const sub = await findOne("subscribers", (s) => s.email === normalized);
    if (sub && sub.unsubscribe_token) {
      try {
        await sendEmail(
          unsubscribeLinkEmail(
            normalized,
            unsubscribeUrl(normalized, sub.unsubscribe_token)
          )
        );
      } catch (err) {
        console.error("[desinscription] envoi lien échoué:", err);
      }
    }
    status = "link-sent";
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        {status === "done" && (
          <>
            <h1 className="text-2xl font-bold">Tu ne recevras plus d&apos;emails</h1>
            <p className="mt-3 text-slate-600">
              C&apos;est noté : on ne t&apos;envoie plus d&apos;alertes ni de
              newsletter. Ton compte reste actif (et ton accès premium si tu en as
              un) ; tu peux réactiver les emails dans tes préférences à tout
              moment.
            </p>
          </>
        )}

        {status === "confirm" && (
          <>
            <h1 className="text-2xl font-bold">Se désinscrire des emails</h1>
            <p className="mt-3 text-slate-600">
              On arrête les alertes et la newsletter. Ton compte et ton accès
              premium éventuel sont <strong>conservés</strong>.
            </p>
            <form
              action="/api/unsubscribe"
              method="post"
              className="mt-6 flex flex-col items-center gap-3"
            >
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
              >
                Ne plus recevoir d&apos;emails
              </button>
              <a href="/" className="text-sm text-slate-500 underline">
                Annuler
              </a>
            </form>
            <p className="mt-6 text-xs text-slate-500">
              Pour <strong>supprimer définitivement ton compte</strong> (et
              résilier le premium), connecte-toi puis va dans{" "}
              <a href="/compte/preferences" className="underline">
                Mes préférences
              </a>
              .
            </p>
          </>
        )}

        {(status === "form" || status === "invalid") && (
          <>
            <h1 className="text-2xl font-bold">Se désinscrire</h1>
            <p className="mt-3 text-slate-600">
              {status === "invalid"
                ? "Ce lien n'est plus valide. Entre ton email, on t'en renvoie un."
                : "Entre ton email : on t'enverra un lien pour confirmer la suppression de ton compte."}
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

        {status === "link-sent" && (
          <>
            <h1 className="text-2xl font-bold">Vérifie ta boîte mail</h1>
            <p className="mt-3 text-slate-600">
              Si cette adresse est inscrite, tu vas recevoir un email avec un lien
              pour confirmer la suppression. C&apos;est une sécurité pour que
              personne ne puisse te désinscrire à ta place.
            </p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
