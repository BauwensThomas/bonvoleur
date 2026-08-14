import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "./supabase";
import { API_BASE } from "./api";

// A appeler une fois au chargement du module (pattern standard expo-web-browser) :
// ferme proprement l'onglet de connexion quand l'app est ramenee au premier plan.
WebBrowser.maybeCompleteAuthSession();

export const AUTH_CALLBACK_URL = Linking.createURL("auth/callback");
// Deep link distinct de la connexion : permet a app/auth/reset-password.tsx
// de savoir qu'il doit proposer un nouveau mot de passe plutot que d'aller
// direct au Dashboard, sans avoir a deviner "pourquoi" la session existe.
export const AUTH_RESET_PASSWORD_URL = Linking.createURL("auth/reset-password");

// Verifie si un email a deja un compte, AVANT de demander un mot de passe -
// meme route que le site (src/app/api/auth/check-email/route.ts), deja en
// CORS pour l'app.
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    return Boolean(json.exists);
  } catch {
    // Silencieux : au pire on montre l'etape inscription pour rien, signUp()
    // rattrapera le cas si le compte existe deja.
    return false;
  }
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

// Inscription : l'aeroport choisi est stocke dans user_metadata, exactement
// comme le site (SignupForm.tsx) - resolveMemberState() (site, partage avec
// l'app via mobile-auth.ts) l'utilise pour creer l'abonne automatiquement des
// la confirmation par email, sans ecran intermediaire.
export async function signUpWithPassword(
  email: string,
  password: string,
  homeAirport: string
): Promise<{ error: string | null; alreadyRegistered: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: AUTH_CALLBACK_URL,
      data: { home_airport: homeAirport },
    },
  });
  if (error) return { error: error.message, alreadyRegistered: false };
  // Email deja inscrit : Supabase renvoie un "faux succes" avec un tableau
  // d'identites vide (comportement standard, evite l'enumeration de comptes).
  const alreadyRegistered = Boolean(data.user && data.user.identities?.length === 0);
  return { error: null, alreadyRegistered };
}

export async function requestPasswordReset(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: AUTH_RESET_PASSWORD_URL,
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
