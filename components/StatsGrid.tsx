import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import type { Stats } from "../hooks/useStats";
import { formatRating } from "../lib/format";

export default function StatsGrid({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return <ActivityIndicator color="#0ea5e9" style={{ marginTop: 32 }} />;
  }

  return (
    <View style={styles.grid}>
      <View style={styles.tile}>
        <Text style={styles.value}>{stats.liveCount}</Text>
        <Text style={styles.label}>Bons plans en ce moment</Text>
      </View>
      <View style={styles.tile}>
        <Text style={styles.value}>{stats.airportsCount}</Text>
        <Text style={styles.label}>Aéroports de départ</Text>
      </View>
      <View style={styles.tile}>
        <Text style={styles.value}>{stats.totalDest}</Text>
        <Text style={styles.label}>Destinations disponibles</Text>
      </View>
      <View style={styles.tile}>
        <Text style={styles.value}>
          {stats.reviewTotal > 0 ? formatRating(stats.reviewAverage) : "-"}
          {stats.reviewTotal > 0 && <Text style={styles.star}> ★</Text>}
        </Text>
        <Text style={styles.label}>
          {stats.reviewTotal >= 50 ? `Note moyenne (${stats.reviewTotal} avis)` : "Note moyenne"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 16,
    rowGap: 12,
  },
  tile: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  value: {
    color: "#0f172a",
    fontSize: 26,
    fontWeight: "800",
  },
  star: {
    color: "#f59e0b",
    fontSize: 18,
  },
  label: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
});
