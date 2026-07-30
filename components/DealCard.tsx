import { StyleSheet, Text, View, Pressable, Linking } from "react-native";
import type { Deal } from "../hooks/useDeals";
import { formatDealDates, detectedAt } from "../lib/format";

// "Berlin (BER)" -> "berlin" (slug de la fiche destination du site web).
// Meme regle que destinationSlug()/slugify() cote site (src/lib/seo-routes.ts).
function destinationSlug(destination: string): string {
  return destination
    .replace(/\s*\([A-Z]{3}\)\s*$/, "")
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Meme densite d'info que la vue "Liste" de /compte cote site web (rangees
// fines separees d'un filet, pas de grosses cartes) - plus adapte a un
// ecran de telephone qu'une grille de cartes avec image. isFirst/isLast
// ferment un seul cadre autour de toute la liste (comme le site :
// "divide-y overflow-hidden rounded-2xl border") plutot que des rangees
// flottantes independantes.
export default function DealCard({
  deal,
  tier,
  isFirst,
  isLast,
}: {
  deal: Deal;
  tier: "free" | "premium";
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const pct =
    deal.normal_price && deal.normal_price > 0
      ? Math.round(100 - (deal.price / deal.normal_price) * 100)
      : null;
  // Premium voit la date de derniere republication (deal "en direct"), gratuit
  // voit TOUJOURS la date de decouverte d'origine - meme regle que
  // src/app/compte/page.tsx cote site. Montrer published_at a un gratuit
  // masquerait le delai de 4 jours (le scanner republie/rafraichit le deal
  // sans que ca change son anciennete reelle pour ce niveau d'acces).
  const detectedDate = tier === "premium" ? deal.published_at ?? deal.created_at : deal.created_at;

  return (
    <View style={[styles.row, isFirst && styles.rowFirst, isLast && styles.rowLast]}>
      <View style={styles.topRow}>
        <View style={styles.info}>
          <Text style={styles.route}>
            {deal.origin} vers {deal.destination}
          </Text>
          <Text style={styles.meta}>
            {deal.dates ? formatDealDates(deal.dates) : ""}
            {deal.airline ? ` · ${deal.airline}` : ""}
          </Text>
          {detectedDate && (
            <Text style={styles.detected}>Déniché le {detectedAt(detectedDate)}</Text>
          )}
        </View>

        <View style={styles.priceCol}>
          {pct ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>-{pct}%</Text>
            </View>
          ) : null}
          <Text style={styles.priceLabel}>aux alentours de</Text>
          <Text style={styles.price}>
            {deal.price}€{pct ? <Text style={styles.strike}> {deal.normal_price}€</Text> : null}
          </Text>
        </View>
      </View>

      <View style={styles.buttonsRow}>
        <Pressable
          style={styles.infoButton}
          onPress={() => Linking.openURL(`https://www.bonvoleur.com/vols-pas-chers/${destinationSlug(deal.destination)}`)}
        >
          <Text style={styles.infoButtonText}>Infos</Text>
        </Pressable>
        <Pressable style={styles.offerButton} onPress={() => Linking.openURL(deal.booking_url)}>
          <Text style={styles.offerButtonText}>Voir l&apos;offre</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#0ea5e9",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  rowLast: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  info: {
    flex: 1,
  },
  route: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  meta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 3,
  },
  detected: {
    color: "#0369a1",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  priceCol: {
    alignItems: "flex-end",
  },
  badge: {
    backgroundColor: "#fef3c7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 4,
  },
  badgeText: {
    color: "#92400e",
    fontSize: 11,
    fontWeight: "700",
  },
  priceLabel: {
    color: "#64748b",
    fontSize: 12,
  },
  price: {
    color: "#0ea5e9",
    fontSize: 18,
    fontWeight: "800",
  },
  strike: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "400",
    textDecorationLine: "line-through",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  infoButton: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  infoButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  offerButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  offerButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
