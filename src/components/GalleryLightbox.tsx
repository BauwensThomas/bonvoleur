"use client";

import { useState, useEffect } from "react";

interface Photo {
  url: string;
  credit: string;
}

export default function GalleryLightbox({ photos, city }: { photos: Photo[]; city: string }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i !== null && i < photos.length - 1 ? i + 1 : i));
      if (e.key === "ArrowLeft") setOpen((i) => (i !== null && i > 0 ? i - 1 : i));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  return (
    <>
      <div className="mt-4 flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 sm:grid sm:grid-cols-5 sm:overflow-x-visible sm:pb-0">
        {photos.map((p, i) => (
          <button
            key={i}
            onClick={() => setOpen(i)}
            className="w-[38%] shrink-0 snap-start sm:w-full"
            aria-label={`Voir ${city} - photo ${i + 1}`}
          >
            <div className="aspect-square w-full overflow-hidden rounded-xl">
              <img
                src={p.url}
                alt={i === 0 ? `Vols pas chers vers ${city}` : `${city} en photos - vue ${i}`}
                loading="lazy"
                className="h-full w-full object-cover transition hover:opacity-90 hover:scale-[1.02]"
              />
            </div>
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(null)}
        >
          <div
            className="relative max-h-full max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[open].url}
              alt={open === 0 ? `Vols pas chers vers ${city}` : `${city} en photos - vue ${open}`}
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
            {photos[open].credit && (
              <p className="mt-2 text-center text-sm text-white/70">
                Photo : {photos[open].credit.replace(/^[Pp]hoto\s+/, "")}
              </p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => setOpen((i) => (i !== null && i > 0 ? i - 1 : i))}
                disabled={open === 0}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-30 hover:bg-white/20"
              >
                ← Précédente
              </button>
              <button
                onClick={() => setOpen(null)}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
              >
                Fermer
              </button>
              <button
                onClick={() => setOpen((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))}
                disabled={open === photos.length - 1}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white disabled:opacity-30 hover:bg-white/20"
              >
                Suivante →
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
