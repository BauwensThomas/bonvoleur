import Link from "next/link";

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
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
            style={d.image ? { backgroundImage: `url(${d.image})` } : undefined}
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute bottom-3 left-4 text-lg font-bold text-white drop-shadow">
            {d.city}
          </span>
          {d.origins.length > 1 && (
            <span className="absolute right-3 bottom-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {d.origins.length} départs
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
