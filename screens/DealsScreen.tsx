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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDeals } from "../hooks/useDeals";
import { useAirports } from "../hooks/useAirports";
import { useHomeAirports } from "../hooks/useHomeAirports";
import { REGIONS } from "../lib/regions";
import { detectedAt } from "../lib/format";
import ScreenLoader from "../components/ScreenLoader";
import DealCard from "../components/DealCard";
import VersionFooter from "../components/VersionFooter";

type Sort = "recent" | "price-asc" | "price-desc";

// YYYY-MM-DD (parametre API), sans souci de fuseau horaire.
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toDisplayDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function originIata(origin: string): string | undefined {
  return origin.match(/\(([A-Z]{3})\)/)?.[1];
}

// Fil des bons plans de l'abonne connecte - equivalent mobile de /compte sur
// le site web, filtres inclus (meme logique que CompteControls.tsx : depart,
// region, destination, prix max, tri - adaptes en panneau depliable plutot
// qu'une rangee de 6 champs, pas assez de place sur un ecran de telephone).
export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const airports = useAirports();
  const homeAirports = useHomeAirports();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [destinationInput, setDestinationInput] = useState("");
  const [destination, setDestination] = useState("");
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

  // Le filtre Depart ne propose QUE les aeroports enregistres par l'abonne
  // (pas tous les aeroports actifs du site) - en gratuit il n'y en a qu'un
  // seul (force, pas de choix), en premium potentiellement plusieurs
  // ("Tous" = combine les siens, ou un en particulier).
  const myAirports = useMemo(
    () => airports.filter((a) => homeAirports.includes(a.iata)),
    [airports, homeAirports],
  );
  const singleAirport = myAirports.length <= 1;
  const effectiveOrigin = singleAirport ? myAirports[0]?.iata ?? "" : origin;

  const activeFilterCount = [
    !singleAirport && origin,
    region,
    maxPriceInput,
    dateFrom,
    dateTo,
  ].filter(Boolean).length;
  const maxPrice = maxPriceInput ? Number(maxPriceInput) : undefined;

  const { result, loading, error, refresh } = useDeals({
    origin: effectiveOrigin || undefined,
    destination: destination || undefined,
    region: region || undefined,
    maxPrice,
    dateFrom: dateFrom ? toISODate(dateFrom) : undefined,
    dateTo: dateTo ? toISODate(dateTo) : undefined,
  });
  const isPremium = result?.tier === "premium";

  const deals = useMemo(() => {
    let list = result?.deals ?? [];
    // "Tous" en premium multi-aeroports : le serveur n'a pas recu de filtre
    // origin (pour ne pas se limiter a un seul), donc on restreint ici aux
    // aeroports de l'abonne plutot que tous ceux du site.
    if (!singleAirport && origin === "" && myAirports.length > 0) {
      const iataSet = new Set(myAirports.map((a) => a.iata));
      list = list.filter((d) => {
        const iata = originIata(d.origin);
        return iata ? iataSet.has(iata) : false;
      });
    }
    if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [result, sort, singleAirport, origin, myAirports]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>
        <Text style={styles.title}>Mes bons plans</Text>
        <View style={styles.backSpacer} />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={destinationInput}
          onChangeText={onDestinationChange}
          placeholder="Chercher une ville ou un code"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
        />
        <Pressable style={styles.filtersButton} onPress={() => setFiltersOpen((v) => !v)}>
          <Text style={styles.filtersButtonText}>Filtres{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</Text>
        </Pressable>
      </View>

      {filtersOpen && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filterLabel}>Départ</Text>
          {singleAirport ? (
            <View style={styles.chipRow}>
              <Chip label={myAirports[0]?.city ?? "…"} active onPress={() => {}} />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Chip label="Tous" active={origin === ""} onPress={() => setOrigin("")} />
              {myAirports.map((a) => (
                <Chip key={a.iata} label={a.city} active={origin === a.iata} onPress={() => setOrigin(a.iata)} />
              ))}
            </ScrollView>
          )}

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
            style={styles.priceInput}
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
          data={deals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
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
                Aucun bon plan ne correspond pour le moment. Reviens bientôt ou ajuste les filtres.
              </Text>
            </View>
          }
          renderItem={({ item }) => <DealCard deal={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
  searchRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
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
    marginHorizontal: 16,
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
