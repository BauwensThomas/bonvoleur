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
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { requestPasswordReset } from "../lib/auth";
import VersionFooter from "../components/VersionFooter";

// Demande de reinitialisation - le lien recu par email ouvre directement
// l'app (bonvoleur://auth/reset-password, voir app/auth/reset-password.tsx),
// jamais besoin de passer par le site.
export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { email: initialEmail } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());

  async function onSubmit() {
    if (!emailValid || busy) return;
    setBusy(true);
    setError(null);
    const { error } = await requestPasswordReset(email.trim());
    setBusy(false);
    if (error) setError(error);
    else setSent(true);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
          style={styles.backLink}
        >
          <Text style={styles.link}>← Retour</Text>
        </Pressable>

        <Text style={styles.title}>Mot de passe oublié</Text>

        {sent ? (
          <Text style={styles.subtitle}>
            Si cette adresse est inscrite, tu vas recevoir un email avec un lien pour
            choisir un nouveau mot de passe. Ouvre-le depuis ce téléphone.
          </Text>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Entre ton email : on t&apos;enverra un lien pour choisir un nouveau mot de
              passe.
            </Text>

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
              style={[styles.buttonPrimary, !emailValid && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={!emailValid || busy}
            >
              {busy ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Recevoir le lien</Text>
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
  backLink: {
    marginBottom: 24,
    alignSelf: "flex-start",
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
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
  link: {
    color: "#0369a1",
    fontWeight: "700",
    fontSize: 14,
  },
  footer: {
    marginTop: "auto",
  },
});
