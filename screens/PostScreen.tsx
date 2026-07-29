import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { Image } from "expo-image";
import Markdown from "react-native-markdown-display";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePost } from "../hooks/usePost";
import { formatArticleDateLong } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import PostCard from "../components/PostCard";
import VersionFooter from "../components/VersionFooter";

// Article complet - equivalent mobile de /blog/[slug] sur le site web.
// Contenu markdown (react-native-markdown-display, meme source que
// react-markdown cote site). Public, pas de session requise.
export default function PostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const { post, loading, notFound, error, refresh } = usePost(slug ?? "");

  return (
    <View style={styles.container}>
      <ScreenHeader title="Article" />

      {loading ? (
        <ScreenLoader />
      ) : notFound ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>Cet article n&apos;existe pas ou plus.</Text>
        </View>
      ) : error || !post ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {post.cover_image && (
            <Image source={{ uri: post.cover_image }} style={styles.cover} contentFit="cover" />
          )}

          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.meta}>
            {post.author} · {formatArticleDateLong(post.published_at ?? post.created_at)} ·{" "}
            {post.reading_minutes} min de lecture
          </Text>
          {post.cover_image && post.cover_image_credit && (
            <Text style={styles.credit}>
              Photo : {post.cover_image_credit.replace(/^[Pp]hoto\s+/, "")}
            </Text>
          )}

          <View style={styles.markdown}>
            <Markdown style={markdownStyles}>{post.content}</Markdown>
          </View>

          {post.faq.length > 0 && (
            <View style={styles.faqSection}>
              <Text style={styles.sectionTitle}>Questions fréquentes</Text>
              {post.faq.map((f, i) => (
                <View key={i} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{f.question}</Text>
                  <Text style={styles.faqAnswer}>{f.answer}</Text>
                </View>
              ))}
            </View>
          )}

          {post.related.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>À lire aussi</Text>
              <View style={styles.relatedList}>
                {post.related.map((p) => (
                  <PostCard key={p.slug} post={p} />
                ))}
              </View>
            </View>
          )}

          <View style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
            <VersionFooter safeArea={false} />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    padding: 16,
  },
  cover: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
  },
  title: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 16,
  },
  meta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 6,
  },
  credit: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 4,
  },
  markdown: {
    marginTop: 20,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },
  faqSection: {
    marginTop: 28,
  },
  faqItem: {
    marginBottom: 14,
  },
  faqQuestion: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  faqAnswer: {
    color: "#475569",
    fontSize: 13,
    marginTop: 4,
    lineHeight: 19,
  },
  relatedSection: {
    marginTop: 28,
  },
  relatedList: {
    gap: 14,
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

const markdownStyles = StyleSheet.create({
  body: {
    color: "#1e293b",
    fontSize: 15,
    lineHeight: 23,
  },
  heading1: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800" as const,
    marginTop: 20,
    marginBottom: 8,
  },
  heading2: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "800" as const,
    marginTop: 18,
    marginBottom: 8,
  },
  heading3: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700" as const,
    marginTop: 16,
    marginBottom: 6,
  },
  link: {
    color: "#0ea5e9",
  },
  strong: {
    fontWeight: "800" as const,
  },
});
