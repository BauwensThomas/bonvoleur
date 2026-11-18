"use client";

// Bandeau des aperçus d'articles (admin et lien privé) : bouton qui ouvre la
// fenêtre d'impression du navigateur pour enregistrer toute la page en PDF.
// Masqué à l'impression, donc absent du PDF.
export default function PrintPreviewBar({ message }: { message: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 print:hidden">
      <span>{message}</span>
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-amber-900 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800"
      >
        Télécharger en PDF
      </button>
      <span className="hidden text-xs font-normal sm:inline">
        (dans la fenêtre qui s&apos;ouvre : destination « Enregistrer au format PDF »)
      </span>
    </div>
  );
}
