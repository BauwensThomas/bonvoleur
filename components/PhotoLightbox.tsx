import { Modal, View, Text, Pressable, FlatList, useWindowDimensions, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface LightboxPhoto {
  url: string;
  credit: string | null;
}

// Visionneuse plein ecran : photo de couverture + galerie combinees dans un
// seul jeu de photos navigable au glissement (comme GalleryLightbox cote
// site web), credit affiche sous chaque photo. useWindowDimensions (pas
// Dimensions.get) pour avoir des tailles fiables des l'ouverture, y compris
// sur l'apercu web.
export default function PhotoLightbox({
  photos,
  index,
  onClose,
}: {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  if (index === null) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { width, height }]}>
        <Pressable style={[styles.closeButton, { top: insets.top + 12 }]} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <FlatList
          data={photos}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          initialScrollIndex={index}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.page, { width, height }]}>
              <Image source={{ uri: item.url }} style={{ width, height: height * 0.65 }} contentFit="contain" />
              {item.credit && <Text style={styles.credit}>{item.credit}</Text>}
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.94)",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
  },
  credit: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
});
