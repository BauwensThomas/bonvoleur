import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMemberSession } from "../hooks/useMemberSession";
import { useDeals } from "../hooks/useDeals";
import { apiFetch, API_BASE } from "../lib/api";
import { formatArticleDateLong } from "../lib/format";
import { FREE_DELAY_DAYS } from "../lib/constants";
import ScreenHeader from "../components/ScreenHeader";
import ScreenLoader from "../components/ScreenLoader";
import VersionFooter from "../components/VersionFooter";

// Gestion de l'abonnement (équivalent mobile de la section haute de /compte
// sur le site). Le paiement/la gestion Stripe restent hors app (décision du
// plan : pas de Google Play Billing) - on récupère juste l'URL Stripe via
// /api/mobile/billing/{checkout,portal} et on l'ouvre dans le navigateur du
// téléphone (Linking.openURL), comme le fait déjà "Comment ça marche".
export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { result, loading, error, refresh } = useMemberSession();

  return (
    <View style={styles.container}>
      <ScreenHeader title="Mon abonnement" />

      {loading ? (
        <ScreenLoader />
      ) : error || !result || result.status !== "member" ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error ?? "Impossible de charger ton abonnement."}</Text>
          <Pressable style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {result.tier === "premium" && (
            <View style={styles.box}>
              <Text style={styles.boxText}>Bons plans actualisés plusieurs fois par jour.</Text>
            </View>
          )}
          {result.tier === "free" && <FreeIntroBox />}

          <InfoCard label="Type d'abonnement" value={result.tier === "premium" ? "Premium" : "Freemium"} />

          {result.tier === "premium" && result.has_stripe_customer ? (
            <PremiumBox session={result} />
          ) : (
            <UpgradeBox alreadyPremium={result.tier === "premium"} onUpgraded={refresh} />
          )}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <VersionFooter safeArea={false} />
      </View>
    </View>
  );
}

function PremiumBox({
  session,
}: {
  session: { premium_until?: string | null; premium_cancel_at_period_end?: boolean; premium_interval?: string | null };
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Erreur");
      await Linking.openURL(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'ouvrir la gestion de l'abonnement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {session.premium_until && (
        <InfoCard label="Date de fin d'abonnement" value={formatArticleDateLong(session.premium_until)} />
      )}

      {session.premium_until && (
        <InfoCard
          label="Renouvellement auto"
          value={session.premium_cancel_at_period_end ? "Non" : "Oui"}
          valueColor={session.premium_cancel_at_period_end ? "#be123c" : "#15803d"}
        />
      )}

      {error && <Text style={styles.formError}>{error}</Text>}
      <Pressable style={styles.outlineButton} onPress={openPortal} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#0369a1" />
        ) : (
          <Text style={styles.outlineButtonText}>Gérer mon abonnement</Text>
        )}
      </Pressable>
    </>
  );
}

function InfoCard({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardLabel}>{label}</Text>
      <Text style={[styles.infoCardValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function FreeIntroBox() {
  const { result: deals } = useDeals();
  return (
    <View style={styles.box}>
      <Text style={styles.boxText}>
        Passe premium : <Text style={styles.bold}>tous</Text> les bons plans en direct (sans les{" "}
        {FREE_DELAY_DAYS} jours de retard), le filtre par période de voyage et un email par jour.
        {deals && deals.liveLockedForFree > 0 && (
          <>
            {" "}
            Actuellement <Text style={styles.bold}>{deals.total}</Text> bon
            {deals.total > 1 ? "s" : ""} plan{deals.total > 1 ? "s" : ""} réservé
            {deals.total > 1 ? "s" : ""} au premium.
          </>
        )}
      </Text>
    </View>
  );
}

function UpgradeBox({ alreadyPremium, onUpgraded }: { alreadyPremium: boolean; onUpgraded: () => void }) {
  const [promoCode, setPromoCode] = useState("");
  const [waived, setWaived] = useState(false);
  const [busyPlan, setBusyPlan] = useState<"monthly" | "yearly" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upgrade(plan: "monthly" | "yearly") {
    if (!waived || busyPlan) return;
    setBusyPlan(plan);
    setError(null);
    try {
      const res = await apiFetch("/api/mobile/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, waive_withdrawal: true, promo_code: promoCode.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Erreur");
      await Linking.openURL(data.url);
      onUpgraded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le paiement n'a pas pu démarrer.");
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <View style={styles.box}>
      {alreadyPremium && (
        <Text style={styles.boxText}>
          Ton accès premium est actif mais aucun paiement n&apos;est enregistré (accordé manuellement).
          Démarre un abonnement payant ci-dessous pour qu&apos;il continue au-delà de sa date
          d&apos;expiration.
        </Text>
      )}

      <TextInput
        value={promoCode}
        onChangeText={setPromoCode}
        placeholder="Code promo (facultatif)"
        placeholderTextColor="#94a3b8"
        autoCapitalize="characters"
        style={styles.input}
      />

      <Pressable style={styles.checkboxRow} onPress={() => setWaived((v) => !v)}>
        <Ionicons name={waived ? "checkbox" : "square-outline"} size={20} color="#0ea5e9" />
        <Text style={styles.checkboxText}>
          Je demande l&apos;accès immédiat au service premium et je reconnais perdre mon droit de
          rétractation de 14 jours dès que le service commence (
          <Text style={styles.link} onPress={() => Linking.openURL(`${API_BASE}/conditions-generales`)}>
            article 6 des CGV
          </Text>
          ).
        </Text>
      </Pressable>

      {error && <Text style={styles.formError}>{error}</Text>}

      <View style={styles.plansRow}>
        <Pressable
          style={[styles.planButton, !waived && styles.planButtonDisabled]}
          onPress={() => upgrade("monthly")}
          disabled={!waived || busyPlan !== null}
        >
          {busyPlan === "monthly" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.planButtonText}>Premium 4,99 € / mois</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.outlineButton, !waived && styles.planButtonDisabled]}
          onPress={() => upgrade("yearly")}
          disabled={!waived || busyPlan !== null}
        >
          {busyPlan === "yearly" ? (
            <ActivityIndicator color="#0369a1" />
          ) : (
            <Text style={styles.outlineButtonText}>ou 39 € / an (4 mois offerts)</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  footer: {
    backgroundColor: "#ffffff",
    paddingTop: 6,
  },
  infoCard: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    backgroundColor: "#f0f9ff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  infoCardLabel: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  infoCardValue: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "400",
    marginTop: 2,
  },
  box: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    backgroundColor: "#f0f9ff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  boxText: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 20,
  },
  bold: {
    fontWeight: "700",
  },
  boxHighlight: {
    color: "#0369a1",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
    lineHeight: 19,
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
    marginTop: 14,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
  },
  checkboxText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
  },
  link: {
    textDecorationLine: "underline",
    color: "#0369a1",
  },
  formError: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 10,
  },
  plansRow: {
    gap: 10,
    marginTop: 14,
  },
  planButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  planButtonDisabled: {
    opacity: 0.5,
  },
  planButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  outlineButtonText: {
    color: "#0369a1",
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
