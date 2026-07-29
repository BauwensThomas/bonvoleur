import { useState } from "react";
import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDestination } from "../hooks/useDestination";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import VersionFooter from "../components/VersionFooter";
import PhotoLightbox from "../components/PhotoLightbox";

// "Vole vers [Rome](https://...)" -> "Vole vers Rome" (retire juste le lien
// markdown pour l'affichage - simplification volontaire, pas de rendu de
// lien cliquable a l'interieur d'un conseil pour ce premier passage).
function stripMdLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

// Fiche destination - equivalent mobile de /vols-pas-chers/[route]. Une
// ville dessert plusieurs aeroports de depart (origins), affiches dans une
// seule fiche (pas une route par couple origine-destination).
export default function DestinationDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { destination, loading, notFound, error, refresh } = useDestination(slug ?? "");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const allPhotos = destination
    ? [
        ...(destination.image ? [{ url: destination.image, credit: destination.imageCredit }] : []),
        ...(destination.photos ?? []),
      ]
    : [];
  const coverOffset = destination?.image ? 1 : 0;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Destination" />

      {loading ? (
        <ScreenLoader />
      ) : notFound ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>Cette destination n&apos;existe pas.</Text>
        </View>
      ) : error || !destination ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {destination.image && (
            <Pressable onPress={() => setLightboxIndex(0)}>
              <Image source={{ uri: destination.image }} style={styles.cover} contentFit="cover" />
            </Pressable>
          )}
          {destination.image && destination.imageCredit && (
            <Text style={styles.credit}>Photo : {destination.imageCredit.replace(/^[Pp]hoto\s+/, "")}</Text>
          )}
          <Text style={styles.title}>{destination.destCity}</Text>
          <Text style={styles.region}>{destination.region}</Text>

          {destination.photos && destination.photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gallery}
            >
              {destination.photos.map((p, i) => (
                <Pressable key={i} style={styles.galleryItem} onPress={() => setLightboxIndex(coverOffset + i)}>
                  <Image source={{ uri: p.url }} style={styles.galleryImage} contentFit="cover" />
                  <Text style={styles.galleryCredit} numberOfLines={1}>
                    {p.credit}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {destination.content && (
            <View style={styles.section}>
              <Text style={styles.intro}>{destination.content.intro}</Text>
              <View style={styles.factRow}>
                <View style={styles.factItem}>
                  <Text style={styles.factLabel}>Durée de vol</Text>
                  <Text style={styles.factValue}>{destination.content.duration}</Text>
                </View>
                <View style={styles.factItem}>
                  <Text style={styles.factLabel}>Meilleure période</Text>
                  <Text style={styles.factValue}>{destination.content.bestPeriod}</Text>
                </View>
              </View>
              {destination.content.airlines.length > 0 && (
                <Text style={styles.airlines}>Compagnies : {destination.content.airlines.join(", ")}</Text>
              )}
              {destination.content.tips.length > 0 && (
                <View style={styles.tips}>
                  {destination.content.tips.map((tip, i) => (
                    <Text key={i} style={styles.tip}>
                      • {stripMdLinks(tip)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {destination.origins.filter((o) => o.weekCount === 1).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Aéroports de départ</Text>
              {destination.origins
                .filter((o) => o.weekCount === 1)
                .map((o) => (
                  <View key={o.originIata} style={styles.originRow}>
                    <Text style={styles.originCity}>{o.originCity}</Text>
                    <View style={styles.originBadge}>
                      <Text style={styles.originBadgeText}>Bon plan actuel</Text>
                    </View>
                  </View>
                ))}
            </View>
          )}

          {destination.faq.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Questions fréquentes</Text>
              {destination.faq.map((f, i) => (
                <View key={i} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{f.question}</Text>
                  <Text style={styles.faqAnswer}>{f.answer}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            <VersionFooter safeArea={false} />
          </View>
        </ScrollView>
      )}

      <PhotoLightbox photos={allPhotos} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    padding: 16,
  },
  cover: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
  },
  title: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 16,
  },
  region: {
    color: "#0369a1",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  credit: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
  },
  section: {
    marginTop: 24,
  },
  gallery: {
    gap: 10,
    marginTop: 14,
  },
  galleryItem: {
    width: 130,
  },
  galleryImage: {
    width: 130,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  galleryCredit: {
    color: "#94a3b8",
    fontSize: 10,
    marginTop: 4,
  },
  intro: {
    color: "#1e293b",
    fontSize: 15,
    lineHeight: 26,
  },
  factRow: {
    gap: 12,
    marginTop: 14,
  },
  factItem: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 12,
    padding: 12,
  },
  factLabel: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  factValue: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 21,
    marginTop: 2,
  },
  airlines: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 14,
  },
  tips: {
    marginTop: 14,
    gap: 6,
  },
  tip: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 21,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  originRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 10,
  },
  originCity: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
  },
  originBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  originBadgeText: {
    color: "#92400e",
    fontSize: 11,
    fontWeight: "700",
  },
  faqItem: {
    marginBottom: 14,
  },
  faqQuestion: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  faqAnswer: {
    color: "#475569",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 21,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
