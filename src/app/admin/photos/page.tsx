import PhotosManager from "@/components/admin/PhotosManager";
import { getDestinations } from "@/lib/routes";
import { getDefaultDestImage, getStorageStats } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PhotosAdmin() {
  // false = images BRUTES (sans repli) pour voir le vrai état de chaque fiche.
  const destinations = (await getDestinations(false))
    .map((d) => ({
      destIata: d.destIata,
      destCity: d.destCity,
      image: d.image,
      hasContent: !!d.content?.intro,
    }))
    .sort((a, b) => a.destCity.localeCompare(b.destCity));
  const defaultImage = await getDefaultDestImage();
  const stats = await getStorageStats();
  const incomplete = destinations.filter((d) => !d.image || !d.hasContent).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Photos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Photo de chaque destination (bannières de route, vignettes « Destinations
        populaires », cartes deals). Récupérées automatiquement (Unsplash) ;
        remplaçables ici en collant une URL. Un badge signale les fiches
        incomplètes.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700">
          {stats.destinations} photo{stats.destinations > 1 ? "s" : ""} de
          destinations
          <span className="text-slate-400">
            {" "}
            · {stats.articles} couverture{stats.articles > 1 ? "s" : ""} d&apos;article
            {stats.articles > 1 ? "s" : ""} · {(stats.bytes / (1024 * 1024)).toFixed(1)} Mo
            au total
          </span>
        </span>
        <span
          className={`rounded-lg px-3 py-1.5 ${
            incomplete > 0
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {incomplete > 0
            ? `${incomplete} fiche(s) incomplète(s)`
            : "Toutes les fiches sont complètes"}
        </span>
      </div>

      <div className="mt-6">
        <PhotosManager initial={destinations} defaultImage={defaultImage} />
      </div>
    </div>
  );
}
