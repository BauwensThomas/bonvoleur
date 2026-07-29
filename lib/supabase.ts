import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

// Memes valeurs publiques que NEXT_PUBLIC_SUPABASE_URL/ANON_KEY cote site web
// (src/lib/mobile-auth.ts) - la cle anon est concue pour etre embarquee cote
// client, la securite vient des policies RLS Supabase, pas du secret de la cle.
const SUPABASE_URL = "https://hdzzfhjnjcblcejcpnkw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkenpmaGpuamNibGNlamNwbmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTYxNDksImV4cCI6MjA5NzE3MjE0OX0.ZuPgp1sJ5CI-cai3bVPgsD8Ym4uKJbEYK97lx1RbXx0";

// SecureStore refuse les valeurs de plus de 2048 octets (limite native iOS/
// Android) - une session Supabase (access token + refresh token + metadata)
// peut depasser cette taille. On la decoupe en plusieurs cles.
const CHUNK_SIZE = 1800;

async function setChunked(key: string, value: string) {
  const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
  await SecureStore.setItemAsync(`${key}_chunks`, String(chunkCount));
  for (let i = 0; i < chunkCount; i++) {
    await SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
  }
}

async function getChunked(key: string): Promise<string | null> {
  const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
  if (!chunkCount) return SecureStore.getItemAsync(key);
  let value = "";
  for (let i = 0; i < Number(chunkCount); i++) {
    value += (await SecureStore.getItemAsync(`${key}_${i}`)) ?? "";
  }
  return value;
}

async function removeChunked(key: string) {
  const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
  if (chunkCount) {
    for (let i = 0; i < Number(chunkCount); i++) {
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
    await SecureStore.deleteItemAsync(`${key}_chunks`);
  }
  await SecureStore.deleteItemAsync(key);
}

// expo-secure-store n'a pas d'implementation sur web (module natif) - utilise
// uniquement pour l'apercu `npm run web`, jamais dans l'app finale. localStorage
// y suffit largement (pas de vrai besoin de securite dans ce mode de preview).
const webStorage = {
  getItem: async (key: string) => (typeof localStorage === "undefined" ? null : localStorage.getItem(key)),
  setItem: async (key: string, value: string) => {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage:
      Platform.OS === "web"
        ? webStorage
        : { getItem: getChunked, setItem: setChunked, removeItem: removeChunked },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // PKCE : le retour de connexion (lien magique ou Google) arrive avec un
    // simple "?code=" dans le lien profond bonvoleur://, plus facile a lire
    // que le flux implicite (tokens dans un fragment #...).
    flowType: "pkce",
  },
});
