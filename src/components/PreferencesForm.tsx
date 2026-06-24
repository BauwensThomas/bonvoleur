"use client";

import { useState } from "react";
import { airports } from "@/lib/site";
import type { EmailFrequency, Tier } from "@/lib/types";

type Status = "idle" | "saving" | "saved" | "error";

export default function PreferencesForm({
  tier,
  initialAirports,
  initialFrequency,
  initialNewsletter,
}: {
  tier: Tier;
  initialAirports: string[];
  initialFrequency: EmailFrequency;
  initialNewsletter: boolean;
}) {
  const isPremium = tier === "premium";
  const [selected, setSelected] = useState<string[]>(
    initialAirports.map((a) => a.toUpperCase())
  );
  const [frequency, setFrequency] = useState<EmailFrequency>(initialFrequency);
  const [newsletter, setNewsletter] = useState<boolean>(initialNewsletter);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  function toggle(iata: string) {
    if (isPremium) {
      setSelected((cur) =>
        cur.includes(iata) ? cur.filter((c) => c !== iata) : [...cur, iata]
      );
    } else {
      // Gratuit : un seul aéroport.
      setSelected([iata]);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      setStatus("error");
      setMessage("Choisis au moins un aéroport de départ.");
      return;
    }
    setStatus("saving");
    setMessage("");
    try {
      const res = await fetch("/api/member/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_airports: selected,
          email_frequency: frequency,
          newsletter,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(json.error ?? "Une erreur est survenue.");
        return;
      }
      setStatus("saved");
      setMessage("Préférences enregistrées.");
    } catch {
      setStatus("error");
      setMessage("Impossible d'enregistrer pour le moment. Réessaie.");
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div>
        <h2 className="font-semibold">
          {isPremium ? "Tes aéroports de départ" : "Ton aéroport de départ"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {isPremium
            ? "Tu peux en suivre plusieurs (avantage premium)."
            : "En gratuit : un seul aéroport. Le premium permet d'en suivre plusieurs."}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {airports.map((a) => {
            const on = selected.includes(a.iata);
            return (
              <label
                key={a.iata}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                  on
                    ? "border-brand bg-brand/5 text-brand-dark"
                    : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <input
                  type={isPremium ? "checkbox" : "radio"}
                  name="airport"
                  checked={on}
                  onChange={() => toggle(a.iata)}
                  className="h-4 w-4"
                />
                {a.city} ({a.iata})
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="font-semibold">Fréquence des emails</h2>
        <div className="mt-3 space-y-2 text-sm">
          {isPremium && (
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="freq"
                checked={frequency === "daily"}
                onChange={() => setFrequency("daily")}
                className="h-4 w-4"
              />
              Tous les jours (premium)
            </label>
          )}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="freq"
              checked={frequency === "weekly"}
              onChange={() => setFrequency("weekly")}
              className="h-4 w-4"
            />
            Une fois par semaine
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="freq"
              checked={frequency === "none"}
              onChange={() => setFrequency("none")}
              className="h-4 w-4"
            />
            En pause (aucun email)
          </label>
        </div>
      </div>

      <div>
        <h2 className="font-semibold">Newsletter du blog</h2>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            className="mt-0.5 h-4 w-4"
          />
          <span>Recevoir la newsletter</span>
        </label>
      </div>

      <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Si tu as déjà reçu ton email du jour, le changement s&apos;applique au{" "}
        <strong>prochain envoi</strong> : pas d&apos;email en plus tout de suite.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {status === "saving" ? "Enregistrement..." : "Enregistrer"}
        </button>
        {message && (
          <span
            className={`text-sm ${
              status === "error" ? "text-red-600" : "text-emerald-700"
            }`}
          >
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
