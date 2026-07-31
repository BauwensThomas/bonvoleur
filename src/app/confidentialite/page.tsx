import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: `Comment ${site.name} collecte, utilise et protège tes données personnelles, conformément au RGPD. Droits d'accès, de rectification et de suppression.`,
  alternates: { canonical: "https://www.bonvoleur.com/confidentialite" },
};

export default function Confidentialite() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <h1 className="text-3xl font-bold">Politique de confidentialité</h1>
        <div className="mt-6 space-y-6 text-slate-700 leading-relaxed">
          <p>
            Chez {site.name}, on collecte le minimum de données, dans un seul
            but : t&apos;envoyer les bons plans de vols auxquels tu t&apos;es
            inscrit. Voici le détail, conformément au RGPD.
          </p>

          <section>
            <h2 className="text-xl font-semibold">Responsable du traitement</h2>
            <p className="mt-2">
              {site.name}{" "}({site.domain}), service édité par Thomas
              (personne physique), Bruxelles, Belgique. Contact :{" "}
              <a className="underline" href={`mailto:${site.email}`}>
                {site.email}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Données collectées</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Adresse email.</li>
              <li>Aéroport(s) de départ choisi(s).</li>
              <li>Date de consentement et statut (gratuit / premium).</li>
              <li>Historique des envois (pour ne pas te renvoyer le même deal).</li>
              <li>
                Connexion : tu te connectes par <strong>« Continuer avec Google »</strong>
                {" "}ou par lien magique envoyé à ton email (sans mot de passe). On
                conserve un identifiant de session pour te garder connecté.
              </li>
              <li>
                Pour les abonnés premium : un identifiant client Stripe, la date de
                fin de période et le statut de renouvellement. Les données de
                paiement (carte) sont gérées par Stripe ; {site.name}{" "}ne voit ni
                ne stocke jamais ton numéro de carte.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Finalités et base légale</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                T&apos;envoyer les alertes deals : sur la base de ton{" "}
                <strong>consentement</strong>.
              </li>
              <li>
                Gérer l&apos;abonnement premium : exécution du{" "}
                <strong>contrat</strong>.
              </li>
              <li>
                Sécurité et mesure d&apos;audience : <strong>intérêt légitime</strong>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Sous-traitants et destinataires</h2>
            <p className="mt-2">
              Tes données ne sont jamais vendues. Elles sont traitées par des
              prestataires techniques : Vercel (hébergement), Supabase (base de
              données et authentification), Google (connexion « Continuer avec
              Google » et régie publicitaire Google AdSense), Resend ou Brevo
              (envoi des emails), Stripe (paiement premium), Travelpayouts /
              Aviasales (liens d&apos;affiliation), ainsi que des outils de
              mesure d&apos;audience. Certains sont situés hors UE (États-Unis)
              avec les garanties appropriées (clauses contractuelles types).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Durée de conservation</h2>
            <p className="mt-2">
              Tes données sont conservées tant que tu es abonné. Après
              désinscription, elles sont supprimées (sous réserve des obligations
              légales de conservation, notamment comptables pour les paiements).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Cookies</h2>
            <p className="mt-2">
              On utilise des <strong>cookies essentiels</strong> sans
              consentement : ceux qui te gardent <strong>connecté</strong> à ton
              espace (session), et ceux posés par <strong>Stripe</strong>{" "}
              sur sa page de paiement (sécurité anti-fraude). Pour les cookies de
              mesure d&apos;audience et de publicité, un bandeau te permet
              d&apos;accepter ou de refuser : ils ne se déclenchent qu&apos;après
              ton acceptation. Tu peux revenir sur ton choix à tout moment via
              « Gérer les cookies » en bas de page.
            </p>
            <p className="mt-2">
              Le site affiche des annonces publicitaires via{" "}
              <strong>Google AdSense</strong>. Si tu acceptes les cookies
              publicitaires, Google et ses partenaires peuvent utiliser des
              cookies pour te montrer des annonces basées sur tes visites sur ce
              site et d&apos;autres sites. Tu peux personnaliser ou désactiver
              les annonces basées sur centres d&apos;intérêt sur{" "}
              <a
                className="underline"
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                adssettings.google.com
              </a>
              , et en savoir plus sur l&apos;utilisation des données par Google
              sur{" "}
              <a
                className="underline"
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
              >
                policies.google.com/technologies/partner-sites
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Tes droits</h2>
            <p className="mt-2">
              Tu disposes d&apos;un droit d&apos;accès, de rectification,
              d&apos;effacement, de limitation, de portabilité et
              d&apos;opposition, ainsi que du droit de retirer ton consentement à
              tout moment. Tu peux te désinscrire en un clic via le lien de chaque
              email ou sur la page{" "}
              <a className="underline" href="/desinscription">
                désinscription
              </a>
              . Pour exercer tes autres droits :{" "}
              <a className="underline" href={`mailto:${site.email}`}>
                {site.email}
              </a>
              .
            </p>
            <p className="mt-2">
              Tu peux aussi introduire une réclamation auprès de l&apos;Autorité
              de protection des données (APD) en Belgique, ou de la CNIL en
              France.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
