import { useState } from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { BANNER_AD_UNIT_ID } from "../lib/ads";
import { useMemberSession } from "../hooks/useMemberSession";

// Petit bloc bannière discret - a placer en BAS d'un ecran (fin de contenu),
// jamais en superposition ni collé en permanence.
// Jamais affichee aux abonnes premium (avantage premium, decision explicite) -
// se masque toute seule, chaque ecran n'a qu'a faire <BannerAdSlot /> sans se
// soucier du tier.
// N'occupe AUCUNE place tant qu'aucune pub n'a reellement charge (ex. app pas
// encore approuvee par AdMob, pas de reseau, aucun inventaire disponible) -
// jamais de case vide visible.
export default function BannerAdSlot() {
  const { result } = useMemberSession();
  const [loaded, setLoaded] = useState(false);

  if (result?.tier === "premium") return null;

  return (
    <View style={loaded ? styles.container : styles.hidden}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginTop: 20,
  },
  hidden: {
    height: 0,
    overflow: "hidden",
  },
});
