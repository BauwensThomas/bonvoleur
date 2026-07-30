import { useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  RefreshControl,
  Linking,
  TextInput,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDeals } from "../hooks/useDeals";
import { useAirports } from "../hooks/useAirports";
import { useHomeAirports } from "../hooks/useHomeAirports";
import { REGIONS } from "../lib/regions";
import { detectedAt } from "../lib/format";
import { FREE_DELAY_DAYS, FREE_MAX_DEALS } from "../lib/constants";
import ScreenLoader from "../components/ScreenLoader";
import DealCard from "../components/DealCard";
import ScreenHeader from "../components/ScreenHeader";
import VersionFooter from "../components/VersionFooter";

type Sort = "recent" | "price-asc" | "price-desc";

// YYYY-MM-DD (parametre API), sans souci de fuseau horaire.
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDisplayDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Fil des bons plans de l'abonne connecte - equivalent mobile de /compte sur
// le site web, filtres inclus (meme logique que CompteControls.tsx : depart,
// region, destination, prix max, tri - adaptes en panneau depliable plutot
// qu'une rangee de 6 champs, pas assez de place sur un ecran de telephone).
export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { destination: destinationParam } = useLocalSearchParams<{ destination?: string }>();
  const airports = useAirports();
  const homeAirports = useHomeAirports();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [destinationInput, setDestinationInput] = useState(destinationParam ?? "");
  const [destination, setDestination] = useState(destinationParam ?? "");
  const destTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [origin, setOrigin] = useState("");
  const [region, setRegion] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  function onDestinationChange(value: string) {
    setDestinationInput(value);
    if (destTimer.current) clearTimeout(destTimer.current);
    destTimer.current = setTimeout(() => setDestination(value), 400);
  }

  function resetFilters() {
    setDestinationInput("");
    setDestination("");
    setOrigin("");
    setRegion("");
    setMaxPriceInput("");
    setSort("recent");
    setDateFrom(null);
    setDateTo(null);
  }

  const activeFilterCount = [origin, region, maxPriceInput, dateFrom, dateTo].filter(Boolean).length;
  const maxPrice = maxPriceInput ? Number(maxPriceInput) : undefined;

  const { result, loading, error, refresh } = useDeals({
    origin: origin || undefined,
    destination: destination || undefined,
    region: region || undefined,
    maxPrice,
    dateFrom: dateFrom ? toISODate(dateFrom) : undefined,
    dateTo: dateTo ? toISODate(dateTo) : undefined,
  });
  const isPremium = result?.tier === "premium";
  const myAirportNames = airports
    .filter((a) => homeAirports.includes(a.iata))
    .map((a) => a.city)
    .join(", ");

  const deals = useMemo(() => {
    const list = result?.deals ?? [];
    if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [result, sort]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mes bons plans" />

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
        // Tout ce qui est au-dessus des resultats (recherche, filtres,
        // bandeau) vit dans le ListHeaderComponent : sinon, ouvrir le
        // panneau de filtres reduisait l'espace du FlatList a presque
        // rien, avec seulement la liste elle-meme qui pouvait scroller.
        // Comme ca, toute la page defile en un seul bloc.
        <FlatList
          style={styles.list}
          data={deals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#0ea5e9" />}
          ListHeaderComponent={
            <>
              {result?.tier === "free" && (
                <Pressable style={styles.upsell} onPress={() => router.push("/abonnement" as never)}>
                  <Text style={styles.upsellText}>
                    Tes alertes email couvrent{" "}
                    <Text style={styles.upsellBold}>{myAirportNames || "ton aéroport"}</Text>. En gratuit, tu vois
                    ici jusqu&apos;à <Text style={styles.upsellBold}>{FREE_MAX_DEALS}</Text> bons plans avec{" "}
                    <Text style={styles.upsellBold}>{FREE_DELAY_DAYS} jours de retard</Text> - passe premium pour
                    tout voir en direct et recevoir toutes les alertes par email.
                  </Text>
                  <View style={styles.upsellButton}>
                    <Text style={styles.upsellButtonText}>Voir mon abonnement</Text>
                  </View>
                </Pressable>
              )}

              <View style={styles.searchRow}>
                <TextInput
                  value={destinationInput}
                  onChangeText={onDestinationChange}
                  placeholder="Ville d'arrivée"
                  placeholderTextColor="#94a3b8"
                  style={styles.searchInput}
                />
                <Pressable style={styles.filtersButton} onPress={() => setFiltersOpen((v) => !v)}>
                  <Text style={styles.filtersButtonText}>
                    Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                  </Text>
                </Pressable>
              </View>

              {filtersOpen && (
                <View style={styles.filtersPanel}>
                  <Text style={styles.filterLabel}>Départ</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    <Chip label="Tous" active={origin === ""} onPress={() => setOrigin("")} />
                    {airports.map((a) => (
                      <Chip
                        key={a.iata}
                        label={homeAirports.includes(a.iata) ? `★ ${a.city}` : a.city}
                        active={origin === a.iata}
                        onPress={() => setOrigin(a.iata)}
                      />
                    ))}
                  </ScrollView>

                  <Text style={styles.filterLabel}>Région</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                    <Chip label="Toutes" active={region === ""} onPress={() => setRegion("")} />
                    {REGIONS.map((r) => (
                      <Chip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />
                    ))}
                  </ScrollView>

                  <Text style={styles.filterLabel}>Prix max (€)</Text>
                  <TextInput
                    value={maxPriceInput}
                    onChangeText={setMaxPriceInput}
                    placeholder="ex. 100"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    style={[styles.priceInput, styles.priceInputStandalone]}
                  />

                  <Text style={styles.filterLabel}>Trier par</Text>
                  <View style={styles.chipRow}>
                    <Chip label="Plus récent" active={sort === "recent"} onPress={() => setSort("recent")} />
                    <Chip label="Prix ↑" active={sort === "price-asc"} onPress={() => setSort("price-asc")} />
                    <Chip label="Prix ↓" active={sort === "price-desc"} onPress={() => setSort("price-desc")} />
                  </View>

                  <View style={styles.periodLabelRow}>
                    <Text style={styles.filterLabel}>Période de voyage</Text>
                    {!isPremium && (
                      <View style={styles.premiumBadge}>
                        <Text style={styles.premiumBadgeText}>Réservé au premium</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.periodRow}>
                    <Pressable
                      style={[styles.dateInput, !isPremium && styles.dateInputDisabled]}
                      disabled={!isPremium}
                      onPress={() => setShowFromPicker(true)}
                    >
                      <Text style={[styles.dateInputText, !isPremium && styles.dateInputTextDisabled]}>
                        {dateFrom ? toDisplayDate(dateFrom) : "du jj/mm/aaaa"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.dateInput, !isPremium && styles.dateInputDisabled]}
                      disabled={!isPremium}
                      onPress={() => setShowToPicker(true)}
                    >
                      <Text style={[styles.dateInputText, !isPremium && styles.dateInputTextDisabled]}>
                        {dateTo ? toDisplayDate(dateTo) : "au jj/mm/aaaa"}
                      </Text>
                    </Pressable>
                  </View>
                  {showFromPicker && (
                    <DateTimePicker
                      value={dateFrom ?? new Date()}
                      mode="date"
                      onChange={(_event, selected) => {
                        setShowFromPicker(false);
                        if (selected) setDateFrom(selected);
                      }}
                    />
                  )}
                  {showToPicker && (
                    <DateTimePicker
                      value={dateTo ?? new Date()}
                      mode="date"
                      onChange={(_event, selected) => {
                        setShowToPicker(false);
                        if (selected) setDateTo(selected);
                      }}
                    />
                  )}

                  <Pressable onPress={resetFilters}>
                    <Text style={styles.resetLink}>Réinitialiser les filtres</Text>
                  </Pressable>
                </View>
              )}

              {result?.lastRefresh && (
                <Text style={styles.lastRefresh}>Dernière actualisation : {detectedAt(result.lastRefresh)}</Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>
                Aucun bon plan ne correspond pour le moment. Reviens bientôt ou ajuste les filtres.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <DealCard
              deal={item}
              tier={result?.tier ?? "free"}
              isFirst={index === 0}
              isLast={index === deals.length - 1}
            />
          )}
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
  searchRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  filtersButton: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  filtersButtonText: {
    color: "#0369a1",
    fontWeight: "700",
    fontSize: 13,
  },
  filtersPanel: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  filterLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
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
  priceInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#0f172a",
  },
  priceInputStandalone: {
    width: 110,
  },
  resetLink: {
    color: "#0369a1",
    fontWeight: "700",
    fontSize: 13,
    marginTop: 14,
  },
  periodLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  premiumBadge: {
    backgroundColor: "#e0f2fe",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    color: "#0369a1",
    fontSize: 10,
    fontWeight: "700",
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateInputDisabled: {
    backgroundColor: "#f1f5f9",
  },
  dateInputText: {
    color: "#0f172a",
    fontSize: 13,
  },
  dateInputTextDisabled: {
    color: "#94a3b8",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
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
    borderColor: "#fef08a",
    backgroundColor: "#fefce8",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
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
