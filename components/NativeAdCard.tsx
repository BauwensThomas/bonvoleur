import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  NativeAd,
  NativeAdView,
  NativeMediaView,
  NativeAsset,
  NativeAssetType,
} from "react-native-google-mobile-ads";
import { NATIVE_AD_UNIT_ID } from "../lib/ads";
import { initAds } from "../lib/adsReady";

// Meme gabarit visuel que PostCard (bordure bleue, coins arrondis) pour se
// fondre dans la liste des articles - avec le libelle "Publicite" obligatoire
// (regles AdMob : un natif doit toujours etre identifiable comme une pub).
//
// La bordure/coins arrondis/overflow sont portes par un View RN classique
// (styles.frame) qui ENVELOPPE NativeAdView, pas par NativeAdView lui-meme :
// NativeAdView est une vue native Android geree par le SDK Google, qui ne
// respecte pas toujours overflow:hidden/borderRadius appliques directement
// dessus (le media natif peut deborder du cadre). L'envelopper dans un View
// RN classique garantit le decoupage visuel quoi qu'il arrive.
export default function NativeAdCard() {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedAd: NativeAd | null = null;
    initAds()
      .then(() => NativeAd.createForAdRequest(NATIVE_AD_UNIT_ID))
      .then((ad) => {
        if (cancelled) {
          ad.destroy();
          return;
        }
        loadedAd = ad;
        setNativeAd(ad);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      loadedAd?.destroy();
    };
  }, []);

  if (!nativeAd) return null;

  return (
    <View style={styles.frame}>
      <NativeAdView nativeAd={nativeAd} style={styles.card}>
        <NativeMediaView style={styles.cover} />
        <View style={styles.body}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.title} numberOfLines={2}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>
          {nativeAd.body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text style={styles.excerpt} numberOfLines={2}>
                {nativeAd.body}
              </Text>
            </NativeAsset>
          ) : null}
          <View style={styles.footer}>
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <Text style={styles.cta}>{nativeAd.callToAction}</Text>
            </NativeAsset>
            <Text style={styles.adLabel}>Publicité</Text>
          </View>
        </View>
      </NativeAdView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  card: {
    flex: 1,
  },
  cover: {
    width: "100%",
    height: 140,
    backgroundColor: "#f1f5f9",
  },
  body: {
    padding: 14,
  },
  title: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  excerpt: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cta: {
    color: "#0ea5e9",
    fontSize: 13,
    fontWeight: "700",
  },
  adLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
