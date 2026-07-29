import { StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { DestinationSummary } from "../hooks/useDestinations";

export default function DestinationCard({ destination }: { destination: DestinationSummary }) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/destinations/${destination.slug}` as never)}
    >
      {destination.image && (
        <Image source={{ uri: destination.image }} style={styles.cover} contentFit="cover" />
      )}
      <View style={styles.overlay}>
        <Text style={styles.city}>{destination.destCity}</Text>
        <Text style={styles.meta}>
          {destination.originCount} aéroport{destination.originCount > 1 ? "s" : ""} de départ
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    height: 140,
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cover: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    backgroundColor: "rgba(15,23,42,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  city: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  meta: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 2,
  },
});
