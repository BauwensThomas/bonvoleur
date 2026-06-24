"use client";

// Bouton de suppression de compte avec confirmation native (évite le clic
// accidentel). Poste vers /api/member/delete.
export default function DeleteAccountButton() {
  return (
    <form
      action="/api/member/delete"
      method="post"
      onSubmit={(e) => {
        if (
          !confirm(
            "Supprimer définitivement ton compte ? Tes données seront effacées et ton abonnement premium éventuel sera résilié immédiatement (sans remboursement de la période en cours). Cette action est irréversible."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-600 hover:text-white"
      >
        Supprimer mon compte
      </button>
    </form>
  );
}
