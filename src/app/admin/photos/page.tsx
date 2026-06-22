import PhotosManager from "@/components/admin/PhotosManager";
import { getDestinations } from "@/lib/routes";
import { getDefaultDestImage } from "@/lib/settings";

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

  return (
    <div>
      <h1 className="text-2xl font-bold">Photos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Photo de chaque destination (bannières de route, vignettes « Destinations
        populaires », cartes deals). Récupérées automatiquement (Unsplash) ;
        remplaçables ici en collant une URL. Un badge signale les fiches
        incomplètes.
      </p>
      <div className="mt-6">
        <PhotosManager initial={destinations} defaultImage={defaultImage} />
      </div>
    </div>
  );
}
