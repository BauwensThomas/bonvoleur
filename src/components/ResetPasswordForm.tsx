"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      setError(
        error.message.includes("session")
          ? "Ce lien n'est plus valide. Redemande un lien de réinitialisation."
          : error.message
      );
      return;
    }

    window.location.href = "/compte";
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3 text-left">
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Nouveau mot de passe
        </label>
        <PasswordInput
          id="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="8 caractères minimum"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>
      <div>
        <label htmlFor="password_confirm" className="block text-sm font-medium mb-1">
          Confirme le mot de passe
        </label>
        <PasswordInput
          id="password_confirm"
          required
          minLength={8}
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "Enregistrement..." : "Choisir ce mot de passe"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
