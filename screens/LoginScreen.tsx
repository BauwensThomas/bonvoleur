import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  checkEmailExists,
  signInWithPassword,
  signUpWithPassword,
  signInWithGoogle,
} from "../lib/auth";
import { useAirports } from "../hooks/useAirports";
import VersionFooter from "../components/VersionFooter";

type Step = "email" | "login-password" | "signup-airport" | "signup-password" | "sent";

// Ecran unique de connexion/inscription (un seul point d'entree depuis
// l'accueil, comme le site avait avant sa propre separation - ici on garde
// UN flux qui se branche selon que l'email existe deja ou non, verifie via
// checkEmailExists() avant de demander un mot de passe pour rien.
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const airports = useAirports();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [homeAirport, setHomeAirport] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"continue" | "password" | "google" | null>(null);

  const emailValid = /\S+@\S+\.\S+/.test(email.trim());

  async function handleContinue() {
    if (!emailValid || busy) return;
    setBusy("continue");
    setError(null);
    const exists = await checkEmailExists(email.trim());
    setBusy(null);
    setStep(exists ? "login-password" : "signup-airport");
  }

  function afterAuthSuccess() {
    if (router.canDismiss()) router.dismissAll();
    router.replace("/dashboard");
  }

  async function handleLogin() {
    if (busy) return;
    setBusy("password");
    setError(null);
    const { error } = await signInWithPassword(email.trim(), password);
    setBusy(null);
    if (error) {
      setError(
        error === "Invalid login credentials"
          ? "Email ou mot de passe incorrect."
          : error
      );
    } else {
      afterAuthSuccess();
    }
  }

  async function handleSignup() {
    if (busy) return;
    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy("password");
    setError(null);
    const { error, alreadyRegistered } = await signUpWithPassword(
      email.trim(),
      password,
      homeAirport
    );
    setBusy(null);
    if (error) {
      setError(error);
      return;
    }
    if (alreadyRegistered) {
      setPassword("");
      setPasswordConfirm("");
      setStep("login-password");
      setError("Un compte existe déjà avec cet email - connecte-toi ci-dessous.");
      return;
    }
    setStep("sent");
  }

  async function handleGoogle() {
    setBusy("google");
    setError(null);
    const { error } = await signInWithGoogle();
    setBusy(null);
    if (error) setError(error);
    else afterAuthSuccess();
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image source={require("../assets/plane-mark.png")} style={styles.brandMark} contentFit="contain" />
          <Text style={styles.headerTitle}>
            BonVoleur<Text style={styles.headerTitleAccent}>.com</Text>
          </Text>
        </View>

        {step === "sent" ? (
          <View style={styles.sentBox}>
            <Text style={styles.title}>Vérifie tes emails</Text>
            <Text style={styles.subtitle}>
              On vient d&apos;envoyer un email de confirmation à {email.trim()}. Ouvre-le
              depuis ce téléphone pour activer ton compte.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Connexion</Text>
            <Text style={styles.subtitle}>Reçois tes bons plans, avec ton mot de passe.</Text>

            {step === "email" && (
              <>
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
                  onPress={handleContinue}
                  disabled={!emailValid || busy !== null}
                >
                  {busy === "continue" ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.buttonPrimaryText}>Continuer</Text>
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
                    <View style={styles.buttonSecondaryContent}>
                      <Image source={require("../assets/google-logo.png")} style={styles.googleLogo} contentFit="contain" />
                      <Text style={styles.buttonSecondaryText}>Continuer avec Google</Text>
                    </View>
                  )}
                </Pressable>
              </>
            )}

            {step === "login-password" && (
              <>
                <Pressable onPress={() => { setStep("email"); setError(null); }} style={styles.backLink}>
                  <Text style={styles.link}>← Changer d&apos;email</Text>
                </Pressable>

                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Ton mot de passe"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  autoComplete="current-password"
                  style={styles.input}
                />

                <Pressable
                  onPress={() => router.push({ pathname: "/forgot-password", params: { email: email.trim() } })}
                  style={styles.forgotLink}
                >
                  <Text style={styles.link}>Mot de passe oublié ?</Text>
                </Pressable>

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable style={styles.buttonPrimary} onPress={handleLogin} disabled={busy !== null}>
                  {busy === "password" ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.buttonPrimaryText}>Me connecter</Text>
                  )}
                </Pressable>
              </>
            )}

            {step === "signup-airport" && (
              <>
                <Pressable onPress={() => { setStep("email"); setError(null); }} style={styles.backLink}>
                  <Text style={styles.link}>← Changer d&apos;email</Text>
                </Pressable>

                <Text style={styles.fieldLabel}>Ton aéroport de départ</Text>
                <View style={styles.chipWrap}>
                  {airports.map((a) => {
                    const on = homeAirport === a.iata;
                    return (
                      <Pressable
                        key={a.iata}
                        onPress={() => setHomeAirport(a.iata)}
                        style={[styles.chip, on && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextActive]}>
                          {a.city} ({a.iata})
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable style={styles.optionRow} onPress={() => setConsent((c) => !c)}>
                  <Ionicons name={consent ? "checkbox" : "square-outline"} size={20} color="#0ea5e9" />
                  <Text style={styles.optionText}>
                    J&apos;accepte de recevoir les alertes deals, la newsletter, et la
                    politique de confidentialité
                  </Text>
                </Pressable>

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  style={[styles.buttonPrimary, !(homeAirport && consent) && styles.buttonDisabled]}
                  onPress={() => setStep("signup-password")}
                  disabled={!(homeAirport && consent)}
                >
                  <Text style={styles.buttonPrimaryText}>Continuer</Text>
                </Pressable>
              </>
            )}

            {step === "signup-password" && (
              <>
                <Pressable onPress={() => { setStep("signup-airport"); setError(null); }} style={styles.backLink}>
                  <Text style={styles.link}>← Retour</Text>
                </Pressable>

                <Text style={styles.fieldLabel}>Choisis un mot de passe</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="8 caractères minimum"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  autoComplete="new-password"
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>Confirme ton mot de passe</Text>
                <TextInput
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  secureTextEntry
                  autoComplete="new-password"
                  style={styles.input}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable style={styles.buttonPrimary} onPress={handleSignup} disabled={busy !== null}>
                  {busy === "password" ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <Text style={styles.buttonPrimaryText}>Créer mon compte</Text>
                  )}
                </Pressable>
              </>
            )}
          </>
        )}

        <View style={styles.footer}>
          <VersionFooter safeArea={false} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flexGrow: 1,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 4,
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
  buttonSecondaryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  googleLogo: {
    width: 18,
    height: 18,
  },
  buttonSecondaryText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
  sentBox: {
    marginTop: 12,
  },
  backLink: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  forgotLink: {
    marginBottom: 16,
    alignSelf: "flex-end",
  },
  link: {
    color: "#0369a1",
    fontWeight: "700",
    fontSize: 14,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: "#0ea5e9",
    borderColor: "#0ea5e9",
  },
  chipText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 20,
  },
  optionText: {
    flex: 1,
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 24,
  },
});
