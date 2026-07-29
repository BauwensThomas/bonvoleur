import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";

// A appeler une fois au chargement du module (pattern standard expo-web-browser) :
// ferme proprement l'onglet de connexion quand l'app est ramenee au premier plan.
WebBrowser.maybeCompleteAuthSession();

export const AUTH_CALLBACK_URL = Linking.createURL("auth/callback");

export async function sendMagicLink(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: AUTH_CALLBACK_URL },
  });
  return { error: error?.message ?? null };
}

// Google OAuth sur mobile : Supabase renvoie une URL d'autorisation qu'on ouvre
// dans un onglet navigateur controle (pas le navigateur externe), pour pouvoir
// intercepter la redirection finale vers bonvoleur://auth/callback.
export async function signInWithGoogle(): Promise<{ error: string | null }> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: AUTH_CALLBACK_URL, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { error: error?.message ?? "Lien de connexion Google indisponible." };

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_CALLBACK_URL);
  if (result.type !== "success" || !result.url) {
    return result.type === "cancel" ? { error: null } : { error: "Connexion Google annulée ou échouée." };
  }

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code;
  if (typeof code !== "string") return { error: "Lien de connexion Google invalide." };

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return { error: exchangeError?.message ?? null };
}
