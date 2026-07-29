import { useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, FlatList, RefreshControl, TextInput, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDestinations } from "../hooks/useDestinations";
import { REGIONS } from "../lib/regions";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import DestinationCard from "../components/DestinationCard";
import VersionFooter from "../components/VersionFooter";

// Liste des destinations - equivalent mobile de /vols-pas-chers sur le site
// web (recherche par ville + filtre region, cote client comme sur le site).
// Public, pas de session requise.
export default function DestinationsScreen() {
  const insets = useSafeAreaInsets();
  const { destinations, loading, error, refresh } = useDestinations();
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");

  const filtered = useMemo(() => {
    let list = destinations ?? [];
    if (region) list = list.filter((d) => d.region === region);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((d) => d.destCity.toLowerCase().includes(q));
    }
    return list;
  }, [destinations, search, region]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Destinations" />

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
          data={filtered}
          keyExtractor={(item) => item.slug}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#0ea5e9" />}
          ListHeaderComponent={
            <>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Chercher une ville"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Chip label="Toutes" active={region === ""} onPress={() => setRegion("")} />
                {REGIONS.map((r) => (
                  <Chip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />
                ))}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>Aucune destination ne correspond.</Text>
            </View>
          }
          renderItem={({ item }) => <DestinationCard destination={item} />}
        />
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <VersionFooter safeArea={false} />
      </View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
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
  row: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9",
  },
  chipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
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
