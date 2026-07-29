import { StyleSheet, Text, View, Pressable, Linking } from "react-native";
import type { Deal } from "../hooks/useDeals";
import { formatDealDates, detectedAt } from "../lib/format";

export default function DealCard({ deal }: { deal: Deal }) {
  const pct =
    deal.normal_price && deal.normal_price > 0
      ? Math.round(100 - (deal.price / deal.normal_price) * 100)
      : null;

  return (
    <Pressable style={styles.card} onPress={() => Linking.openURL(deal.booking_url)}>
      <View style={styles.cardTopRow}>
        {pct ? (
          <View style={styles.badgeDiscount}>
            <Text style={styles.badgeDiscountText}>-{pct}%</Text>
          </View>
        ) : (
          <View style={styles.badgeDefault}>
            <Text style={styles.badgeDefaultText}>Bon plan</Text>
          </View>
        )}
        {deal.airline && <Text style={styles.airline}>{deal.airline}</Text>}
      </View>

      <Text style={styles.route}>
        {deal.origin} vers {deal.destination}
      </Text>

      <Text style={styles.priceRow}>
        <Text style={styles.priceLabel}>aux alentours de </Text>
        <Text style={styles.price}>{deal.price}€</Text>
        {pct && <Text style={styles.strikePrice}> {deal.normal_price}€</Text>}
        <Text style={styles.priceLabel}> aller-retour</Text>
      </Text>

      {deal.dates && <Text style={styles.dates}>Dates : {formatDealDates(deal.dates)}</Text>}

      {deal.published_at && (
        <Text style={styles.detected}>Déniché le {detectedAt(deal.published_at)}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#fff",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeDiscount: {
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeDiscountText: {
    color: "#92400e",
    fontSize: 12,
    fontWeight: "700",
  },
  badgeDefault: {
    backgroundColor: "#e0f2fe",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeDefaultText: {
    color: "#0369a1",
    fontSize: 12,
    fontWeight: "700",
  },
  airline: {
    color: "#94a3b8",
    fontSize: 12,
  },
  route: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  priceRow: {
    marginTop: 6,
  },
  priceLabel: {
    color: "#64748b",
    fontSize: 13,
  },
  price: {
    color: "#0ea5e9",
    fontSize: 20,
    fontWeight: "800",
  },
  strikePrice: {
    color: "#94a3b8",
    fontSize: 13,
    textDecorationLine: "line-through",
  },
  dates: {
    color: "#475569",
    fontSize: 13,
    marginTop: 6,
  },
  detected: {
    color: "#0369a1",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 8,
  },
});
