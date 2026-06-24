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

  if (done === "soft" || done === "delete") {
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
      <main className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        {status === "done" && done === "delete" && (
          <>
            <h1 className="text-2xl font-bold">Ton compte a été supprimé</h1>
            <p className="mt-3 text-slate-600">
              Toutes tes données ont été effacées et, si tu avais un abonnement
              premium, il a été résilié. Tu ne recevras plus aucun email et tu ne
              seras plus débité. Tu peux te réinscrire à tout moment sur{" "}
              {site.domain}.
            </p>
          </>
        )}
        {status === "done" && done === "soft" && (
          <>
            <h1 className="text-2xl font-bold">Tu ne recevras plus d&apos;emails</h1>
            <p className="mt-3 text-slate-600">
              C&apos;est noté : on ne t&apos;envoie plus d&apos;alertes ni de
              newsletter. Ton compte reste actif (et ton accès premium si tu en as
              un). Tu peux réactiver les emails dans tes préférences à tout moment.
            </p>
          </>
        )}

        {status === "confirm" && (
          <>
            <h1 className="text-2xl font-bold">Se désinscrire</h1>
            <p className="mt-3 text-slate-600">
              Que veux-tu faire ?
            </p>

            <div className="mt-6 space-y-4 text-left">
              {/* Option sûre : arrêter les emails, garder le compte. */}
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">
                  Ne plus recevoir d&apos;emails
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  On arrête les alertes et la newsletter. Ton compte et ton accès
                  premium éventuel sont <strong>conservés</strong>.
                </p>
                <form action="/api/unsubscribe" method="post" className="mt-3">
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="mode" value="soft" />
                  <button
                    type="submit"
                    className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
                  >
                    Ne plus recevoir d&apos;emails
                  </button>
                </form>
              </div>

              {/* Option destructive : supprimer tout le compte. */}
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
                <p className="font-semibold text-slate-900">
                  Supprimer définitivement mon compte
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Action <strong>irréversible</strong> : efface ton compte et tes
                  données. Un abonnement premium est{" "}
                  <strong>résilié immédiatement</strong> (sans remboursement de la
                  période en cours).
                </p>
                <form action="/api/unsubscribe" method="post" className="mt-3">
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="mode" value="delete" />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-600 px-5 py-2.5 font-semibold text-red-700 hover:bg-red-600 hover:text-white"
                  >
                    Supprimer tout mon compte
                  </button>
                </form>
              </div>
            </div>

            <a href="/" className="mt-5 inline-block text-sm text-slate-500 underline">
              Annuler
            </a>
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
