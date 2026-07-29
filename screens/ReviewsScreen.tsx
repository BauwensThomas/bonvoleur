import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  FlatList,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReviews, type Review } from "../hooks/useReviews";
import { useSession } from "../hooks/useSession";
import { apiFetch } from "../lib/api";
import { formatRating } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import VersionFooter from "../components/VersionFooter";

// Avis clients - equivalent mobile de la section "Ce qu'ils en pensent" de
// la homepage, en liste complete. Un membre connecte qui n'a pas encore
// laisse d'avis peut en soumettre un (un seul, pas de remplacement depuis
// l'app - contrairement au site qui autorise a corriger via le lien email).
export default function ReviewsScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { result, loading, error, refresh } = useReviews();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Avis" />

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
          data={result?.reviews ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor="#0ea5e9" />}
          ListHeaderComponent={
            <>
              {result && result.total > 0 && (
                <View style={styles.summary}>
                  <Text style={styles.summaryValue}>
                    {formatRating(result.average)} <Text style={styles.summaryStar}>★</Text>
                  </Text>
                  <Text style={styles.summaryLabel}>
                    {result.total} avis
                  </Text>
                </View>
              )}

              {session && (
                <ReviewFormOrStatus myReview={result?.myReview ?? null} onSubmitted={refresh} />
              )}
            </>
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>Aucun avis pour l&apos;instant.</Text>
            </View>
          }
          renderItem={({ item }) => <ReviewCard review={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <VersionFooter safeArea={false} />
      </View>
    </View>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>{review.name}</Text>
        <Text style={styles.cardStars}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</Text>
      </View>
      {review.comment && <Text style={styles.cardComment}>{review.comment}</Text>}
    </View>
  );
}

function ReviewFormOrStatus({
  myReview,
  onSubmitted,
}: {
  myReview: { rating: number; name: string; comment: string | null; status: string } | null;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (myReview) {
    return (
      <View style={styles.myReviewBox}>
        <Text style={styles.myReviewTitle}>Ton avis</Text>
        <Text style={styles.cardStars}>{"★".repeat(myReview.rating)}{"☆".repeat(5 - myReview.rating)}</Text>
        {myReview.comment && <Text style={styles.cardComment}>{myReview.comment}</Text>}
        {myReview.status === "pending" && (
          <Text style={styles.pendingText}>En attente de validation.</Text>
        )}
      </View>
    );
  }

  async function submit() {
    if (rating === 0 || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, name: name.trim(), comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'envoyer ton avis.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.formBox}>
      <Text style={styles.formTitle}>Ton avis nous intéresse</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setRating(n)}>
            <Ionicons
              name={n <= rating ? "star" : "star-outline"}
              size={30}
              color="#f59e0b"
            />
          </Pressable>
        ))}
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ton prénom"
        placeholderTextColor="#94a3b8"
        style={styles.input}
      />
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Un commentaire (facultatif)"
        placeholderTextColor="#94a3b8"
        style={[styles.input, styles.inputMultiline]}
        multiline
        maxLength={150}
      />
      {error && <Text style={styles.formError}>{error}</Text>}
      <Pressable
        style={[styles.submitButton, (rating === 0 || !name.trim()) && styles.submitButtonDisabled]}
        onPress={submit}
        disabled={rating === 0 || !name.trim() || busy}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Envoyer</Text>}
      </Pressable>
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
  summary: {
    alignItems: "center",
    marginBottom: 20,
  },
  summaryValue: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "800",
  },
  summaryStar: {
    color: "#f59e0b",
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fff",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  cardStars: {
    color: "#f59e0b",
    fontSize: 14,
  },
  cardComment: {
    color: "#475569",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  myReviewBox: {
    borderWidth: 1,
    borderColor: "#fbcfe8",
    backgroundColor: "#fdf2f8",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  myReviewTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  pendingText: {
    color: "#be123c",
    fontSize: 12,
    marginTop: 6,
  },
  formBox: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    backgroundColor: "#f0f9ff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 10,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  formError: {
    color: "#dc2626",
    fontSize: 12,
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
