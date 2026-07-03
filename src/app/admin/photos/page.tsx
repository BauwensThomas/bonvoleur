import PhotosManager, { type DestPhoto } from "@/components/admin/PhotosManager";
import { getDestinations } from "@/lib/routes";
import { getDefaultDestImage, getStorageStats, getStorageDestFiles } from "@/lib/settings";

export const dynamic = "force-dynamic";

function storagePath(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/photos\/(.+?)(\?|$)/);
  return m ? m[1] : null;
}

function sizeKb(url: string | null, fileSizes: Record<string, number>): number | null {
  const path = storagePath(url);
  if (!path) return null;
  const bytes = fileSizes[path];
  return bytes ? Math.round(bytes / 1024) : null;
}

export default async function PhotosAdmin() {
  const [destinations, defaultImage, stats, fileSizes] = await Promise.all([
    getDestinations(false),
    getDefaultDestImage(),
    getStorageStats(),
    getStorageDestFiles(),
  ]);

  const mapped: DestPhoto[] = destinations
    .map((d) => {
      const rawGallery = (d.photos ?? []).slice(0, 4);
      const gallery: (DestPhoto["gallery"][0])[] = rawGallery.map((p) => ({
        url: p.url,
        credit: p.credit,
        sizeKb: sizeKb(p.url, fileSizes),
      }));
      while (gallery.length < 4) gallery.push(null);
      return {
        destIata: d.destIata,
        destCity: d.destCity,
        cover: {
          url: d.image,
          credit: d.imageCredit ?? "",
          sizeKb: sizeKb(d.image, fileSizes),
        },
        gallery,
        hasContent: !!d.content?.intro,
      };
    })
    .sort((a, b) => a.destCity.localeCompare(b.destCity));

  const incomplete = mapped.filter((d) => !d.cover.url || !d.hasContent).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Photos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bannière + galerie de chaque destination. Générées automatiquement (5 photos Unsplash
        par batch unique) puis hébergées chez nous. Clique sur une photo pour la remplacer.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-700">
          {stats.destinations} fichier{stats.destinations > 1 ? "s" : ""} dans Storage
          <span className="text-slate-400">
            {` · ${(stats.bytes / (1024 * 1024)).toFixed(1)} Mo total`}
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
        <PhotosManager initial={mapped} defaultImage={defaultImage} />
      </div>
    </div>
  );
}
