import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

// Point d'atterrissage du lien de reinitialisation envoye par email (deep
// link bonvoleur://auth/reset-password?code=...) - distinct de
// auth/callback.tsx (connexion normale) pour ne jamais confondre "juste se
// connecter" et "je veux choisir un nouveau mot de passe".
type Stage = "exchanging" | "form" | "saving" | "done" | "error";

export default function ResetPassword() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("exchanging");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    if (!code) {
      setError("Lien de réinitialisation invalide ou expiré.");
      setStage("error");
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setError("Lien de réinitialisation invalide ou expiré.");
        setStage("error");
      } else {
        setStage("form");
      }
    });
  }, [code]);

  async function onSubmit() {
    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setStage("saving");
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setStage("form");
      return;
    }
    setStage("done");
    if (router.canDismiss()) router.dismissAll();
    router.replace("/dashboard");
  }

  if (stage === "exchanging" || stage === "done") {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#0ea5e9" />
        <Text style={styles.text}>Vérification du lien...</Text>
      </View>
    );
  }

  if (stage === "error") {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={() => router.replace("/forgot-password")} style={styles.linkButton}>
          <Text style={styles.link}>Redemander un lien</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.formContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Choisis un nouveau mot de passe</Text>

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="8 caractères minimum"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        autoComplete="new-password"
        style={styles.input}
      />
      <TextInput
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        placeholder="Confirme le mot de passe"
        placeholderTextColor="#94a3b8"
        secureTextEntry
        autoComplete="new-password"
        style={styles.input}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.buttonPrimary} onPress={onSubmit} disabled={stage === "saving"}>
        {stage === "saving" ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.buttonPrimaryText}>Choisir ce mot de passe</Text>
        )}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    gap: 12,
    paddingHorizontal: 24,
  },
  formContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 20,
  },
  text: {
    color: "#64748b",
    fontSize: 14,
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    marginBottom: 8,
    textAlign: "center",
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
  buttonPrimary: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonPrimaryText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 15,
  },
  linkButton: {
    marginTop: 8,
  },
  link: {
    color: "#0369a1",
    fontWeight: "700",
    fontSize: 14,
  },
});
