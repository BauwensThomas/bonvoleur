import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Conditions générales",
  description: `Conditions générales d'utilisation et de vente de ${site.name}.`,
};

export default function ConditionsGenerales() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-12">
        <h1 className="text-3xl font-bold">
          Conditions générales d&apos;utilisation et de vente
        </h1>
        <p className="mt-2 text-slate-500 text-sm">
          Dernière mise à jour : 11 juin 2026
        </p>

        <div className="mt-6 space-y-6 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold">1. Objet</h2>
            <p className="mt-2">
              Les présentes conditions générales régissent l&apos;utilisation du
              service {site.name}{" "}({site.domain}) et la souscription à
              l&apos;abonnement premium. En utilisant le site ou en
              t&apos;inscrivant, tu acceptes ces conditions sans réserve.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Éditeur</h2>
            <p className="mt-2">
              Le service {site.name}{" "}est édité par Bauwens Thomas (personne
              physique), Bruxelles, Belgique. Contact :{" "}
              <a className="underline" href={`mailto:${site.email}`}>
                {site.email}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Description du service</h2>
            <p className="mt-2">
              {site.name}{" "}est un service d&apos;alertes de bons plans de vols au
              départ de la Belgique et de la France. {site.name}{" "}ne vend pas de
              billets et n&apos;est pas une agence de voyage : les réservations
              se font directement sur les sites des compagnies aériennes ou de
              partenaires tiers.
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>
                <strong>Offre gratuite :</strong> environ une alerte par
                semaine, pour un aéroport de départ au choix.
              </li>
              <li>
                <strong>Offre premium :</strong> jusqu&apos;à une alerte par
                jour, plusieurs aéroports de départ au choix, accès aux meilleurs
                bons plans en priorité.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Inscription</h2>
            <p className="mt-2">
              L&apos;inscription se fait par email avec ton consentement. Tu
              t&apos;engages à fournir une adresse valide dont tu es titulaire.
              Tu peux te désinscrire à tout moment via le lien présent dans
              chaque email ou sur la page{" "}
              <a className="underline" href="/desinscription">
                désinscription
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              5. Abonnement premium, prix et paiement
            </h2>
            <p className="mt-2">
              L&apos;abonnement premium est proposé au prix de{" "}
              <mark className="bg-yellow-200 px-1 font-semibold">
                4,99 € par mois ou 39 € par an (TTC)
              </mark>{" "}
              <span className="bg-yellow-200 px-1 text-sm text-red-700">
                [À CONFIRMER / MODIFIER avant la mise en ligne du paiement]
              </span>
              . Le paiement est traité de façon sécurisée par notre prestataire
              Stripe. {site.name}{" "}ne stocke jamais tes données de carte bancaire.
            </p>
            <p className="mt-2">
              L&apos;abonnement est reconduit automatiquement à chaque échéance,
              jusqu&apos;à sa résiliation. Le prix applicable est celui en
              vigueur au moment de chaque renouvellement ; toute modification de
              prix te sera communiquée à l&apos;avance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Droit de rétractation</h2>
            <p className="mt-2">
              Conformément au droit de la consommation, tu disposes d&apos;un
              délai de 14 jours à compter de la souscription pour te rétracter,
              sans avoir à te justifier. Pour l&apos;exercer, le plus simple est
              d&apos;annuler ton abonnement depuis le portail Stripe ; tu peux
              aussi nous adresser une déclaration claire, par exemple par email à{" "}
              <a className="underline" href={`mailto:${site.email}`}>
                {site.email}
              </a>
              . Si tu as demandé que le service démarre immédiatement, une somme
              proportionnelle au service déjà fourni pourra être retenue.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Résiliation</h2>
            <p className="mt-2">
              Tu peux résilier ton abonnement premium à tout moment, en toute
              autonomie, depuis le portail de gestion Stripe (bouton « Gérer mon
              abonnement »). La résiliation prend effet à la fin de la période
              déjà payée : tu
              gardes l&apos;accès premium jusqu&apos;à cette date, et aucun
              remboursement de la période en cours n&apos;est effectué (sauf
              exercice du droit de rétractation ci-dessus).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              8. Disponibilité et prix des vols
            </h2>
            <p className="mt-2">
              Les bons plans signalés sont constatés à un instant donné et sont
              indicatifs. Les prix, dates et disponibilités dépendent des
              compagnies aériennes et peuvent changer ou disparaître à tout
              moment. {site.name}{" "}ne garantit ni la disponibilité ni le prix
              d&apos;une offre, et ne saurait être tenu responsable d&apos;une
              réservation effectuée par l&apos;utilisateur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Liens d&apos;affiliation</h2>
            <p className="mt-2">
              Certains liens présents sur le site et dans les emails sont des
              liens d&apos;affiliation. {site.name}{" "}peut percevoir une
              commission, sans aucun surcoût pour toi. Cela n&apos;influence pas
              la sélection des bons plans.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Responsabilité</h2>
            <p className="mt-2">
              {site.name}{" "}fournit un service d&apos;information et met tout en
              oeuvre pour la qualité des alertes, sans obligation de résultat. Le
              service est fourni en l&apos;état et peut être interrompu pour
              maintenance ou cas de force majeure. {site.name}{" "}n&apos;est pas
              partie au contrat de transport conclu entre toi et la compagnie
              aérienne.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              11. Propriété intellectuelle
            </h2>
            <p className="mt-2">
              Le contenu du site (textes, logo, mise en page) est la propriété de{" "}
              {site.name}, sauf mention contraire. Toute reproduction sans
              autorisation est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">12. Données personnelles</h2>
            <p className="mt-2">
              Le traitement de tes données est détaillé dans notre{" "}
              <a className="underline" href="/confidentialite">
                politique de confidentialité
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              13. Modification des conditions
            </h2>
            <p className="mt-2">
              {site.name}{" "}peut modifier les présentes conditions. La version
              applicable est celle en ligne au moment de ton utilisation du
              service. En cas de changement important, tu en seras informé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">
              14. Droit applicable et litiges
            </h2>
            <p className="mt-2">
              Les présentes conditions sont régies par le droit belge. En cas de
              litige, et à défaut de solution amiable, les tribunaux compétents
              seront ceux du ressort de Bruxelles. En tant que
              consommateur, tu peux aussi recourir à la plateforme européenne de
              règlement en ligne des litiges.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
