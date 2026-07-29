import ReviewsScreen from "../screens/ReviewsScreen";

// Public, comme la homepage - pas de verification de session pour lire.
// Le formulaire de soumission ne s'affiche que si connecte (gere dans
// ReviewsScreen via useSession()).
export default function Avis() {
  return <ReviewsScreen />;
}
