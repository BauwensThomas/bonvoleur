import DashboardScreen from "../screens/DashboardScreen";

// Route de developpement uniquement : affiche le tableau de bord sans
// verifier la session, pour continuer a iterer sur le design tant que la
// connexion reelle n'est pas testable (Google/lien magique necessitent un
// vrai build - voir memoire). Jamais liee depuis l'app elle-meme, a ouvrir
// directement via l'URL (ex: http://localhost:8081/dashboard-preview).
export default function DashboardPreview() {
  return <DashboardScreen />;
}
