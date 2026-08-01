import { useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, FlatList, RefreshControl, TextInput, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDestinations, type DestinationSummary } from "../hooks/useDestinations";
import { useMemberSession } from "../hooks/useMemberSession";
import { REGIONS } from "../lib/regions";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import DestinationCard from "../components/DestinationCard";
import NativeAdCard from "../components/NativeAdCard";
import BannerAdSlot from "../components/BannerAdSlot";
import VersionFooter from "../components/VersionFooter";

type Row =
  | { kind: "destinations"; key: string; items: DestinationSummary[] }
  | { kind: "ad"; key: string };

// Grille en 2 colonnes : une pub pleine largeur toutes les 4 lignes (~8
// tuiles), la 1ere plus tot (2 lignes) pour ne pas laisser l'ecran vide -
// meme logique que la grille destinations du site, jamais pour les premium.
const ROWS_PER_AD = 4;
const FIRST_AD_ROW = 2;

function buildRows(list: DestinationSummary[], showAds: boolean): Row[] {
  const rows: Row[] = [];
  let rowIndex = 0;
  for (let i = 0; i < list.length; i += 2) {
    rowIndex++;
    rows.push({ kind: "destinations", key: `row-${i}`, items: list.slice(i, i + 2) });
    const isFirst = rowIndex === FIRST_AD_ROW;
    const isRepeat = rowIndex > FIRST_AD_ROW && (rowIndex - FIRST_AD_ROW) % ROWS_PER_AD === 0;
    if (showAds && (isFirst || isRepeat)) {
      rows.push({ kind: "ad", key: `ad-${i}` });
    }
  }
  return rows;
}

// Liste des destinations - equivalent mobile de /vols-pas-chers sur le site
// web (recherche par ville + filtre region, cote client comme sur le site).
// Public, pas de session requise.
export default function DestinationsScreen() {
  const insets = useSafeAreaInsets();
  const { destinations, loading, error, refresh } = useDestinations();
  const { result: session } = useMemberSession();
  const isPremium = session?.tier === "premium";
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

  const rows = useMemo(() => buildRows(filtered, !isPremium), [filtered, isPremium]);

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
          data={rows}
          keyExtractor={(item) => item.key}
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
          renderItem={({ item }) =>
            item.kind === "ad" ? (
              <View style={styles.adRow}>
                <NativeAdCard />
              </View>
            ) : (
              <View style={styles.row}>
                {item.items.map((d) => (
                  <DestinationCard key={d.slug} destination={d} />
                ))}
                {item.items.length === 1 && <View style={styles.cardSpacer} />}
              </View>
            )
          }
        />
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <BannerAdSlot />
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
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  adRow: {
    marginBottom: 12,
  },
  cardSpacer: {
    width: "48%",
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
