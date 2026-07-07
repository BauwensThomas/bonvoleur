"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error" | "rate-limited";

export default function ResendConfirmationForm({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });

      if (res.status === 429) {
        setStatus("rate-limited");
        setMessage("Patiente quelques minutes avant de renvoyer un email.");
        return;
      }

      if (!res.ok) {
        throw new Error(`Erreur ${res.status}`);
      }

      setStatus("success");
      setMessage("✅ Email renvoyé ! Vérifie ta boîte mail (et les spams).");
      setTimeout(() => setStatus("idle"), 5000);
    } catch (err) {
      setStatus("error");
      setMessage("❌ Erreur lors du renvoi. Réessaie plus tard.");
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleSubmit}
        disabled={status === "loading"}
        className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 hover:bg-brand-dark"
      >
        {status === "loading"
          ? "Envoi en cours..."
          : "Renvoyer l'email de confirmation"}
      </button>

      {status === "success" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      )}

      {status === "rate-limited" && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {message}
        </p>
      )}

      {status === "error" && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {message}
        </p>
      )}

      <p className="text-xs text-slate-500">
        Pas de réponse ? Vérifie aussi tes spams. Si l'email ne contient que du
        texte vide, c'est un problème avec ton fournisseur email (certains
        hébergeurs comme Skynet bloquent les emails externes).
      </p>
    </div>
  );
}
