"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { airports } from "@/lib/site";

const GoogleSignInButton = dynamic(
  () => import("@/components/GoogleSignInButton"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-10 w-full items-center justify-center rounded-lg border border-slate-300 text-sm text-slate-400">
        Chargement...
      </div>
    ),
  }
);

type Status = "idle" | "loading" | "success" | "error";

export default function SignupForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const airport = String(data.get("home_airport") ?? "");
    const payload = {
      email: String(data.get("email") ?? ""),
      // Gratuit : un seul aéroport. (Multi-aéroports = premium.)
      home_airports: airport ? [airport] : [],
      consent: data.get("consent") === "on",
      // Honeypot anti-spam : doit rester vide.
      website: String(data.get("website") ?? ""),
    };

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error ?? "Une erreur est survenue.");
        return;
      }
      setStatus("success");
      setShowLogin(Boolean(json.alreadySubscribed));
      setMessage(
        json.alreadySubscribed
          ? "Tu es déjà inscrit avec cet email. Tu peux te connecter."
          : "Presque fini ! Ouvre l'email qu'on vient de t'envoyer et clique sur le lien pour confirmer ton inscription."
      );
      form.reset();
    } catch {
      setStatus("error");
      setMessage("Impossible de t'inscrire pour le moment. Réessaie.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
        <p className="font-semibold text-emerald-800">
          {showLogin ? "Content de te revoir" : "Bienvenue à bord"}
        </p>
        <p className="mt-1 text-sm text-emerald-700">{message}</p>
        {showLogin && (
          <a
            href="/compte"
            className="mt-4 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Connexion
          </a>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <GoogleSignInButton next="/compte" label="S'inscrire avec Google" />
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="h-px flex-1 bg-slate-200" />
        ou par email
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Ton email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="ton@email.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="home_airport"
            className="block text-sm font-medium mb-1"
          >
            Ton aéroport de départ
          </label>
          <select
            id="home_airport"
            name="home_airport"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none bg-white"
          >
            <option value="">Choisis ton aéroport</option>
            {airports.map((a) => (
              <option key={a.iata} value={a.iata}>
                {a.city} ({a.iata})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Gratuit : 1 aéroport, 1 email par semaine. Premium : plusieurs
            aéroports, 1 email par jour.
          </p>
        </div>
      </div>

      {/* Honeypot : caché, ne pas remplir */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Ne pas remplir</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input
          name="consent"
          type="checkbox"
          required
          className="mt-1 h-4 w-4 rounded border-slate-300"
        />
        <span>
          J&apos;accepte de recevoir les alertes deals, la newsletter, et la{" "}
          <a href="/confidentialite" className="underline">
            politique de confidentialité
          </a>
        </span>
      </label>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-60"
      >
        {status === "loading"
          ? "Inscription..."
          : "Reçois les prochains deals gratuitement"}
      </button>

      {status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
      <p className="text-xs text-slate-500 text-center">
        Gratuit. Désinscription en un clic. Pas de spam.
      </p>
    </form>
  );
}
