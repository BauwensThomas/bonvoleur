import DealsScreen from "../screens/DealsScreen";

// Route de developpement uniquement, meme principe que dashboard-preview.tsx :
// affiche l'ecran sans verifier de session. La recherche/les filtres restent
// visibles et utilisables (useAirports() est public) ; sans session, la
// liste elle-meme affiche l'etat d'erreur (401) plutot que de vraies donnees -
// suffisant pour voir la mise en page du panneau de filtres.
export default function DealsPreview() {
  return <DealsScreen />;
}
