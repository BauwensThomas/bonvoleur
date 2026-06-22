import { discountPct } from "@/lib/site";
import { destinationImage, DEFAULT_DEST_IMAGE } from "@/lib/destinations";

interface DealCardProps {
  origin: string;
  destination: string;
  price: number;
  normal_price?: number | null;
  dates?: string;
  airline?: string | null;
  postedAt?: string;
  // Mode vitrine accueil : route + prix uniquement (aucune info qui aiderait
  // a retrouver l'offre soi-meme : ni dates, ni compagnie, ni date de decouverte).
  teaser?: boolean;
  // Photo de la destination (base/Unsplash). A defaut, fallback sur /public.
  image?: string | null;
}

const cardClass =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg";

export default function DealCard({
  origin,
  destination,
  price,
  normal_price,
  dates,
  airline,
  postedAt,
  teaser = false,
  image,
}: DealCardProps) {
  const img =
    (image !== undefined ? image : destinationImage(destination)) ??
    DEFAULT_DEST_IMAGE;

  // Mode vitrine accueil : photo 70% / texte 30%.
  if (teaser) {
    return (
      <div className={`flex h-72 flex-col ${cardClass}`}>
        <div
          className="relative h-[70%] bg-linear-to-br from-brand-dark to-brand bg-cover bg-center"
          style={img ? { backgroundImage: `url(${img})` } : undefined}
        >
          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-brand-dark">
            Bon plan
          </span>
        </div>
        <div className="flex h-[30%] flex-col justify-center px-4">
          <p className="font-semibold leading-tight text-slate-900">
            {origin} vers {destination}
          </p>
          <p className="mt-1">
            <span className="text-sm text-slate-500">aux alentours de </span>
            <span className="text-xl font-bold text-brand tabular-nums">
              {price}€
            </span>
            <span className="ml-1 text-sm text-slate-500">aller-retour</span>
          </p>
        </div>
      </div>
    );
  }

  const pct =
    normal_price && normal_price > 0 ? discountPct(price, normal_price) : null;
  return (
    <div className={cardClass}>
      {img && (
        <div
          className="h-32 bg-slate-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${img})` }}
        />
      )}
      <div className="p-5">
        <div className="flex items-center justify-between">
          {pct ? (
            <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent-dark">
              -{pct}%
            </span>
          ) : (
            <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand-dark">
              Bon plan
            </span>
          )}
          {airline && <span className="text-xs text-slate-500">{airline}</span>}
        </div>
        <p className="mt-3 font-semibold text-slate-900">
          {origin} vers {destination}
        </p>
        <p className="mt-2">
          <span className="text-sm text-slate-500">aux alentours de </span>
          <span className="text-2xl font-bold text-brand tabular-nums">
            {price}€
          </span>
          {pct && (
            <span className="ml-2 text-sm text-slate-700 line-through tabular-nums">
              {normal_price}€
            </span>
          )}
          <span className="ml-1 text-sm text-slate-500">aller-retour</span>
        </p>
        {dates && (
          <p className="mt-2 text-sm text-slate-600">Dates : {dates}</p>
        )}
        {postedAt && (
          <p className="mt-2 text-xs font-medium text-accent-dark">
            Déniché le{" "}
            {new Date(postedAt).toLocaleString("fr-BE", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
