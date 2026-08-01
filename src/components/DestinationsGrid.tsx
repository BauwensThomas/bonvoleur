import { Fragment } from "react";
import Link from "next/link";
import { DEFAULT_DEST_IMAGE } from "@/lib/destinations";
import { AD_SLOTS } from "@/lib/ads";
import AdUnit from "./AdUnit";

// "Toutes les 4 lignes" cale sur la grille desktop (4 colonnes) - sur mobile
// (2 colonnes) ca revient a toutes les 8 lignes, compromis normal pour une
// grille responsive (voir memoire/discussion : pas de hauteur fixe possible
// pour un bloc In-feed, donc pas de calage parfait par ecran).
const AD_INTERVAL = 16;
// La 1ere pub arrive plus tot que le rythme de croisiere (sinon l'ecran
// parait vide avant de voir une seule pub) : ~2 rangees desktop, puis on
// retombe sur AD_INTERVAL.
const AD_FIRST = 8;

interface Origin {
  city: string;
  iata: string;
  routeSlug: string;
}
export interface DestinationCard {
  city: string;
  slug: string;
  image: string | null;
  origins: Origin[];
}

// Grille de destinations sur l'accueil. Chaque vignette mène à la fiche
// destination (où l'on choisit son aéroport de départ).
export default function DestinationsGrid({
  destinations,
  adsEnabled,
}: {
  destinations: DestinationCard[];
  adsEnabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {destinations.map((d, i) => (
        <Fragment key={d.slug}>
          <Link
            href={`/vols-pas-chers/${d.slug}`}
            className="group relative block aspect-4/3 overflow-hidden rounded-2xl bg-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.image ?? DEFAULT_DEST_IMAGE}
              alt=""
              width={400}
              height={300}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute bottom-3 left-4 text-lg font-bold text-white drop-shadow">
              {d.city}
            </span>
          </Link>
          {adsEnabled &&
            (i + 1 === AD_FIRST ||
              (i + 1 > AD_FIRST && (i + 1 - AD_FIRST) % AD_INTERVAL === 0)) && (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <span className="absolute left-3 top-2 z-10 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Publicité
              </span>
              <div className="pt-7">
                <AdUnit
                  slot={AD_SLOTS.inFeedDestinations.slot}
                  layoutKey={AD_SLOTS.inFeedDestinations.layoutKey}
                  format="fluid"
                />
              </div>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
