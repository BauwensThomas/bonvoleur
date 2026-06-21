import PhotosManager from "@/components/admin/PhotosManager";
import { getDestinations } from "@/lib/routes";

export const dynamic = "force-dynamic";

export default async function PhotosAdmin() {
  const destinations = (await getDestinations()).map((d) => ({
    destIata: d.destIata,
    destCity: d.destCity,
    image: d.image,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Photos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Photo de chaque destination (utilisée sur les bannières de route, les
        vignettes « Destinations populaires » et les cartes deals). Les photos
        sont récupérées automatiquement (Unsplash) ; tu peux les remplacer ici
        en collant une autre URL d&apos;image.
      </p>
      <div className="mt-6">
        <PhotosManager initial={destinations} />
      </div>
    </div>
  );
}
