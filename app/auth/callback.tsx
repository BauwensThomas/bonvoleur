import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

// Point d'atterrissage du lien magique envoye par email (deep link
// bonvoleur://auth/callback?code=...). Le flux Google, lui, echange deja le
// code dans lib/auth.ts (signInWithGoogle) sans jamais passer par cet ecran.
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError("Lien de connexion invalide ou expiré.");
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError("Lien de connexion invalide ou expiré.");
      else router.replace("/dashboard");
    });
  }, [code, router]);

  return (
    <View style={styles.container}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <ActivityIndicator color="#0ea5e9" />
          <Text style={styles.text}>Connexion en cours...</Text>
        </>
      )}
    </View>
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
  text: {
    color: "#64748b",
    fontSize: 14,
  },
  error: {
    color: "#dc2626",
    fontSize: 14,
    textAlign: "center",
  },
});
