import { StyleSheet, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { PopularDestination } from "../hooks/usePopularDestinations";

// Meme visuel que DestinationsGrid.tsx cote site (photo + nom de ville en bas,
// pas de metadonnee supplementaire) - ouvre la meme fiche destination que la
// tuile "Destinations" (route partagee /destinations/[slug]).
export default function PopularDestinationCard({ destination }: { destination: PopularDestination }) {
  const router = useRouter();

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/destinations/${destination.slug}` as never)}>
      {destination.image && (
        <Image source={{ uri: destination.image }} style={styles.cover} contentFit="cover" />
      )}
      <Text style={styles.city}>{destination.city}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%",
    height: 110,
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 10,
  },
  cover: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  city: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
