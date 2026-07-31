import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { BANNER_AD_UNIT_ID } from "../lib/ads";
import { useMemberSession } from "../hooks/useMemberSession";

// Petit bloc bannière discret - a placer en BAS d'un ecran (fin de contenu),
// jamais en superposition ni collé en permanence.
// Jamais affichee aux abonnes premium (avantage premium, decision explicite) -
// se masque toute seule, chaque ecran n'a qu'a faire <BannerAdSlot /> sans se
// soucier du tier.
export default function BannerAdSlot() {
  const { result } = useMemberSession();
  if (result?.tier === "premium") return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 20,
  },
});
