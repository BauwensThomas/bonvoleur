import { discountPct } from "@/lib/site";

interface DealCardProps {
  origin: string;
  destination: string;
  price: number;
  normal_price?: number | null;
  dates: string;
  airline?: string | null;
  postedAt?: string;
}

export default function DealCard({
  origin,
  destination,
  price,
  normal_price,
  dates,
  airline,
  postedAt,
}: DealCardProps) {
  const pct =
    normal_price && normal_price > 0 ? discountPct(price, normal_price) : null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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
        <span className="text-2xl font-bold text-brand">{price}€</span>
        {pct && (
          <span className="ml-2 text-sm text-slate-400 line-through">
            {normal_price}€
          </span>
        )}
        <span className="ml-1 text-sm text-slate-500">aller-retour</span>
      </p>
      {dates && <p className="mt-2 text-sm text-slate-600">Dates : {dates}</p>}
      {postedAt && (
        <p className="mt-2 text-xs text-slate-400">
          Déniché le{" "}
          {new Date(postedAt).toLocaleDateString("fr-BE", {
            day: "numeric",
            month: "long",
          })}
        </p>
      )}
    </div>
  );
}
