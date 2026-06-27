import Link from "next/link";
import { DEFAULT_DEST_IMAGE } from "@/lib/destinations";

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
}: {
  destinations: DestinationCard[];
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {destinations.map((d) => (
        <Link
          key={d.slug}
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
      ))}
    </div>
  );
}
