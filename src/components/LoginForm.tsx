"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

// Connexion abonné : « Continuer avec Google » + email/mot de passe.
// Session longue gérée par Supabase ; l'utilisateur ne se reconnecte pas à
// chaque visite.
export default function LoginForm({ next }: { next?: string } = {}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`
      : undefined;
  const forgotPasswordHref = `/mot-de-passe-oublie${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "invalid" : error.message);
      return;
    }
    window.location.href = next || "/compte";
  }

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold">Connexion</h1>
      <p className="mt-1 text-sm text-slate-600">
        Connecte-toi pour accéder à tes bons plans : avec Google, ou avec ton
        email et ton mot de passe.
      </p>

      <button
        onClick={google}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 transition hover:border-brand hover:text-brand"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
          />
        </svg>
        Continuer avec Google
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        ou par email
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={login} className="space-y-3">
        <input
          type="email"
          name="email"
          id="member-email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.com"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
        <PasswordInput
          name="password"
          id="member-password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Ton mot de passe"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
        <div className="text-right">
          <a href={forgotPasswordHref} className="text-xs text-brand hover:underline">
            Mot de passe oublié ?
          </a>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? "Connexion..." : "Me connecter"}
        </button>
      </form>

      {error === "invalid" ? (
        <p className="mt-3 text-sm text-red-600">
          Email ou mot de passe incorrect. Si tu t&apos;es inscrit avec
          Google, utilise le bouton Google ci-dessus - sinon clique sur{" "}
          <a href={forgotPasswordHref} className="underline">
            Mot de passe oublié
          </a>{" "}
          pour en définir un.
        </p>
      ) : (
        error && <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
