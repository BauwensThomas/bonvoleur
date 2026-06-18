import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: `Mentions légales de ${site.name}.`,
};

export default function MentionsLegales() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-12">
        <h1 className="text-3xl font-bold">Mentions légales</h1>
        <div className="mt-6 space-y-6 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold">Éditeur du site</h2>
            <p className="mt-2">
              {site.name}{" "}({site.domain}), service édité par une personne
              physique.
              <br />
              Bruxelles, Belgique.
              <br />
              Contact :{" "}
              <a className="underline" href={`mailto:${site.email}`}>
                {site.email}
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Responsable de la publication</h2>
            <p className="mt-2">Thomas, administrateur.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Hébergement</h2>
            <p className="mt-2">
              Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723,
              États-Unis. Site : vercel.com.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Objet du service</h2>
            <p className="mt-2">
              {site.name}{" "}est un service d&apos;alertes de bons plans de vols au
              départ de la Belgique et de la France. {site.name}{" "}ne vend pas de
              billets : les réservations se font directement sur les sites des
              compagnies ou de partenaires tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Liens d&apos;affiliation</h2>
            <p className="mt-2">
              Certains liens présents sur le site et dans les emails sont des
              liens d&apos;affiliation. {site.name}{" "}peut percevoir une
              commission, sans aucun surcoût pour toi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Avertissement sur les prix</h2>
            <p className="mt-2">
              Les prix et erreurs de prix signalés sont indicatifs et constatés
              à un instant donné. Ils peuvent être modifiés ou annulés par les
              compagnies à tout moment. {site.name}{" "}ne garantit ni la
              disponibilité ni le prix des offres et ne saurait être tenu
              responsable d&apos;une réservation effectuée par l&apos;utilisateur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Propriété intellectuelle</h2>
            <p className="mt-2">
              Le contenu du site (textes, logo, mise en page) est la propriété de
              {" "}
              {site.name}, sauf mentions contraires. Toute reproduction sans
              autorisation est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Données personnelles</h2>
            <p className="mt-2">
              Le traitement des données est détaillé dans notre{" "}
              <a className="underline" href="/confidentialite">
                politique de confidentialité
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Droit applicable</h2>
            <p className="mt-2">
              Le présent site est régi par le droit belge. En cas de litige, et à
              défaut de solution amiable, les tribunaux compétents seront ceux du
              ressort de Bruxelles.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
