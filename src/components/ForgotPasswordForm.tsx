"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reinitialiser-mot-de-passe`,
    });
    setBusy(false);
    // Message neutre dans tous les cas (on ne révèle pas si l'adresse existe).
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-6 space-y-2">
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Si cette adresse est inscrite, tu vas recevoir un email avec un lien
          pour choisir un nouveau mot de passe.
        </p>
        <p className="text-xs text-slate-500">
          Rien reçu après quelques minutes (et pas dans les spams) ? Tu t&apos;es
          peut-être inscrit avant la mise en place des mots de passe -{" "}
          <a href="/#inscription" className="underline">
            inscris-toi avec cette même adresse
          </a>{" "}
          pour en créer un.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"
    >
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="ton@email.com"
        className="rounded-lg border border-slate-300 px-3 py-2.5 sm:w-72"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "Envoi..." : "Recevoir le lien"}
      </button>
      {error && <p className="mt-1 w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
