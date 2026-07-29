import { StyleSheet, Text, View, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DealCard from "../components/DealCard";
import type { Deal } from "../hooks/useDeals";

// Route de developpement uniquement : donnees factices (pas d'appel API, pas
// besoin de session) pour iterer sur le design des cartes de deals - meme
// principe que dashboard-preview.tsx.
const SAMPLE_DEALS: Deal[] = [
  {
    id: "sample-1",
    origin: "Bruxelles (BRU)",
    destination: "Barcelone",
    price: 39,
    normal_price: 89,
    dates: "2026-09-12 au 2026-09-16",
    airline: "Ryanair",
    booking_url: "https://www.bonvoleur.com",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: "sample-2",
    origin: "Paris (ORY)",
    destination: "Lisbonne",
    price: 54,
    normal_price: null,
    dates: "2026-10-03 au 2026-10-07",
    airline: "TAP",
    booking_url: "https://www.bonvoleur.com",
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

export default function DealsPreview() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { marginTop: insets.top + 16 }]}>Mes bons plans (aperçu)</Text>
      <FlatList
        data={SAMPLE_DEALS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => <DealCard deal={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 12,
  },
});
