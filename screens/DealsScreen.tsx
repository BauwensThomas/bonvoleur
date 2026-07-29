import { StyleSheet, Text, View, Pressable, FlatList, RefreshControl, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDeals } from "../hooks/useDeals";
import { detectedAt } from "../lib/format";
import ScreenLoader from "../components/ScreenLoader";
import DealCard from "../components/DealCard";

// Fil des bons plans de l'abonne connecte - equivalent mobile de /compte sur
// le site web. Le gating premium/gratuit (nombre de deals, fraicheur) est
// deja gere cote serveur par getMemberDeals(), on affiche juste ce qui revient.
export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { result, loading, error, refresh } = useDeals();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>
        <Text style={styles.title}>Mes bons plans</Text>
        <View style={styles.backSpacer} />
      </View>

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
          data={result?.deals ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#0ea5e9" />}
          ListHeaderComponent={
            <>
              {result?.lastRefresh && (
                <Text style={styles.lastRefresh}>Dernière actualisation : {detectedAt(result.lastRefresh)}</Text>
              )}
              {result?.tier === "free" && (result?.liveLockedForFree ?? 0) > 0 && (
                <View style={styles.upsell}>
                  <Text style={styles.upsellText}>
                    Passe premium : <Text style={styles.upsellBold}>tous</Text> les bons plans en direct, sans
                    retard. Actuellement <Text style={styles.upsellBold}>{result?.total}</Text> bon
                    {(result?.total ?? 0) > 1 ? "s" : ""} plan{(result?.total ?? 0) > 1 ? "s" : ""} réservé
                    {(result?.total ?? 0) > 1 ? "s" : ""} au premium.
                  </Text>
                  <Pressable
                    style={styles.upsellButton}
                    onPress={() => Linking.openURL("https://www.bonvoleur.com/compte")}
                  >
                    <Text style={styles.upsellButtonText}>Voir mon abonnement</Text>
                  </Pressable>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>
                Aucun bon plan pour l&apos;instant depuis tes aéroports. Reviens bientôt.
              </Text>
            </View>
          }
          renderItem={({ item }) => <DealCard deal={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  back: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
  },
  backSpacer: {
    width: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
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
    marginTop: 40,
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
  lastRefresh: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 12,
  },
  upsell: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    backgroundColor: "#f0f9ff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  upsellText: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 19,
  },
  upsellBold: {
    fontWeight: "800",
    color: "#0f172a",
  },
  upsellButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  upsellButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});
