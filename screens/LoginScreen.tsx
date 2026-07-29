import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendMagicLink, signInWithGoogle } from "../lib/auth";
import VersionFooter from "../components/VersionFooter";

// Ecran de connexion : lien magique par email (le meme mecanisme que le site
// web) ou Google. Pas de mot de passe - coherent avec l'auth existante.
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  const canSubmit = /\S+@\S+\.\S+/.test(email.trim()) && busy === null;

  async function handleMagicLink() {
    if (!canSubmit) return;
    setBusy("email");
    setError(null);
    const { error } = await sendMagicLink(email.trim());
    setBusy(null);
    if (error) setError(error);
    else setSent(true);
  }

  async function handleGoogle() {
    setBusy("google");
    setError(null);
    const { error } = await signInWithGoogle();
    setBusy(null);
    if (error) setError(error);
    else router.replace("/dashboard");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.brand}>
          <Image source={require("../assets/plane-mark.png")} style={styles.brandMark} contentFit="contain" />
          <Text style={styles.headerTitle}>
            BonVoleur<Text style={styles.headerTitleAccent}>.com</Text>
          </Text>
        </View>

        {sent ? (
          <View style={styles.sentBox}>
            <Text style={styles.title}>Vérifie tes emails</Text>
            <Text style={styles.subtitle}>
              On vient d&apos;envoyer un lien de connexion à {email.trim()}. Ouvre-le depuis ce téléphone.
            </Text>
            <Pressable onPress={() => setSent(false)}>
              <Text style={styles.link}>Renvoyer ou changer d&apos;email</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>Reçois tes bons plans, sans mot de passe.</Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={styles.input}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.buttonPrimary, !canSubmit && styles.buttonDisabled]}
              onPress={handleMagicLink}
              disabled={!canSubmit}
            >
              {busy === "email" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Recevoir le lien magique</Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable style={styles.buttonSecondary} onPress={handleGoogle} disabled={busy !== null}>
              {busy === "google" ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.buttonSecondaryText}>Continuer avec Google</Text>
              )}
            </Pressable>
          </>
        )}

        <View style={styles.footer}>
          <VersionFooter safeArea={false} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 40,
  },
  brandMark: {
    width: 26,
    height: 26,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  headerTitleAccent: {
    color: "#0369a1",
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 6,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0f172a",
    marginBottom: 8,
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    marginBottom: 8,
  },
  buttonPrimary: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  dividerText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonSecondaryText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
  sentBox: {
    marginTop: 12,
  },
  link: {
    color: "#0369a1",
    fontWeight: "700",
    fontSize: 14,
    marginTop: 20,
  },
  footer: {
    marginTop: "auto",
  },
});
