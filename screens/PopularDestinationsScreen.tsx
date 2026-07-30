import { StyleSheet, Text, View, Pressable, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePopularDestinations } from "../hooks/usePopularDestinations";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import PopularDestinationCard from "../components/PopularDestinationCard";
import VersionFooter from "../components/VersionFooter";

// Villes populaires - equivalent mobile de la section "Destinations
// populaires" de la homepage (les 8 villes avec le plus d'aeroports de
// depart ayant un bon plan actif, pas la liste complete). Public, pas de
// session requise, meme fiche destination que la tuile "Destinations".
export default function PopularDestinationsScreen() {
  const insets = useSafeAreaInsets();
  const { destinations, loading, error, refresh } = usePopularDestinations();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Villes populaires" />

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
          data={destinations ?? []}
          keyExtractor={(item) => item.slug}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#0ea5e9" />}
          ListHeaderComponent={
            <Text style={styles.subtitle}>Clique sur une ville et choisis ton aéroport de départ.</Text>
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>Aucune ville populaire pour l&apos;instant.</Text>
            </View>
          }
          renderItem={({ item }) => <PopularDestinationCard destination={item} />}
        />
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <VersionFooter safeArea={false} />
      </View>
    </View>
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
  row: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 14,
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
