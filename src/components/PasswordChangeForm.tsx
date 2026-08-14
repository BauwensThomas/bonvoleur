"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

type Status = "idle" | "saving" | "saved" | "error";

export default function PasswordChangeForm() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      setStatus("error");
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setStatus("saving");
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("saved");
    setMessage("Mot de passe mis à jour.");
    setPassword("");
    setPasswordConfirm("");
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor="new_password" className="block text-sm font-medium mb-1">
          Nouveau mot de passe
        </label>
        <PasswordInput
          id="new_password"
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
        <label htmlFor="new_password_confirm" className="block text-sm font-medium mb-1">
          Confirme le mot de passe
        </label>
        <PasswordInput
          id="new_password_confirm"
          required
          minLength={8}
          autoComplete="new-password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {status === "saving" ? "Enregistrement..." : "Changer le mot de passe"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-emerald-700">{message}</span>
        )}
        {status === "error" && (
          <span className="text-sm text-red-600">{message}</span>
        )}
      </div>
    </form>
  );
}
