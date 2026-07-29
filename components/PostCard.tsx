import { StyleSheet, Text, View, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import type { PostSummary } from "../hooks/usePosts";
import { formatArticleDate } from "../lib/format";

export default function PostCard({ post }: { post: PostSummary }) {
  const router = useRouter();

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/blog/${post.slug}` as never)}>
      {post.cover_image && (
        <Image source={{ uri: post.cover_image }} style={styles.cover} contentFit="cover" />
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={styles.excerpt} numberOfLines={2}>
          {post.excerpt}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.readLink}>Lire l&apos;article</Text>
          <Text style={styles.date}>{formatArticleDate(post.published_at ?? post.created_at)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    height: 140,
    backgroundColor: "#f1f5f9",
  },
  body: {
    padding: 14,
  },
  title: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  excerpt: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  readLink: {
    color: "#0ea5e9",
    fontSize: 13,
    fontWeight: "700",
  },
  date: {
    color: "#0f172a",
    fontSize: 12,
  },
});
