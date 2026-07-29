import { StyleSheet, Text, View, Pressable, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePosts } from "../hooks/usePosts";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import PostCard from "../components/PostCard";
import VersionFooter from "../components/VersionFooter";

// Liste des articles publies - equivalent mobile de /blog sur le site web.
// Public (comme le site), pas de session requise pour consulter.
export default function BlogScreen() {
  const insets = useSafeAreaInsets();
  const { posts, loading, error, refresh } = usePosts();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Blog" />

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
          data={posts ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#0ea5e9" />}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>Aucun article pour l&apos;instant.</Text>
            </View>
          }
          renderItem={({ item }) => <PostCard post={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        />
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <VersionFooter safeArea={false} />
      </View>
    </View>
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
