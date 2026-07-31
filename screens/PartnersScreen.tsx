import { StyleSheet, Text, View, Pressable, FlatList, RefreshControl, Linking } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePartners, type Partner } from "../hooks/usePartners";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import BannerAdSlot from "../components/BannerAdSlot";
import VersionFooter from "../components/VersionFooter";

// Partenaires - equivalent mobile de la section "Nos partenaires voyage" de
// la homepage. Public, pas de session requise. Chaque carte ouvre le lien
// d'affiliation dans le navigateur (site tiers, pas une page de l'app).
export default function PartnersScreen() {
  const insets = useSafeAreaInsets();
  const { partners, loading, error, refresh } = usePartners();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Partenaires" />

      {loading ? (
        <ScreenLoader />
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={partners ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#0ea5e9" />}
          ListHeaderComponent={
            <Text style={styles.subtitle}>Certains liens sont des liens partenaires (affiliation).</Text>
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>Aucun partenaire pour l&apos;instant.</Text>
            </View>
          }
          renderItem={({ item }) => <PartnerCard partner={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <BannerAdSlot />
        <VersionFooter safeArea={false} />
      </View>
    </View>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <Pressable style={styles.card} onPress={() => Linking.openURL(partner.url)}>
      <View style={styles.cardTop}>
        <View style={styles.cardText}>
          <Text style={styles.category}>{partner.category}</Text>
          <Text style={styles.name}>{partner.name}</Text>
        </View>
        {partner.logo && <Image source={{ uri: partner.logo }} style={styles.logo} contentFit="contain" />}
      </View>
      <Text style={styles.description}>{partner.description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 14,
  },
  card: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 14,
    padding: 16,
    backgroundColor: "#fff",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  cardText: {
    flex: 1,
  },
  logo: {
    width: 80,
    height: 28,
  },
  category: {
    color: "#0369a1",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  name: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  description: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  footer: {
    backgroundColor: "#ffffff",
    paddingTop: 6,
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
  emptyText: {
    color: "#64748b",
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
