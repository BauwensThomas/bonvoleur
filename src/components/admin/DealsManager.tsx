"use client";

import { useState } from "react";
import type { Deal } from "@/lib/types";

type Draft = Partial<Deal>;
const empty: Draft = {
  origin: "",
  destination: "",
  price: undefined,
  normal_price: undefined,
  dates: "",
  airline: "",
  booking_url: "",
  is_error_fare: false,
};

export default function DealsManager({ initial }: { initial: Deal[] }) {
  const [items, setItems] = useState<Deal[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [emailDeal, setEmailDeal] = useState<Deal | null>(null);
  const [busyEmailId, setBusyEmailId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function reload() {
    const res = await fetch("/api/admin/deals");
    const data: Deal[] = await res.json();
    setItems(data);
    // garde la modale email à jour si elle est ouverte
    if (emailDeal) {
      const fresh = data.find((d) => d.id === emailDeal.id);
      if (fresh) setEmailDeal(fresh);
    }
  }

  async function genEmail(d: Deal) {
    setBusyEmailId(d.id);
    const res = await fetch("/api/admin/deals/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: d.id }),
    });
    setBusyEmailId(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Échec de la génération de l'email");
      return;
    }
    await reload();
  }

  async function sendDeal(d: Deal) {
    if (
      !confirm(
        "Envoyer cet email aux abonnés dont l'aéroport correspond à l'origine du deal ?"
      )
    )
      return;
    setSending(true);
    const res = await fetch("/api/admin/deals/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: d.id }),
    });
    setSending(false);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(j.error ?? "Échec de l'envoi");
      return;
    }
    alert(
      `Envoyé à ${j.sent} abonné(s) (aéroport ${j.targetIata ?? "?"}).` +
        (j.sent === 0
          ? " Aucun abonné n'a choisi cet aéroport pour le moment."
          : "")
    );
    await reload();
  }

  async function save() {
    if (!draft) return;
    const method = draft.id ? "PUT" : "POST";
    const res = await fetch("/api/admin/deals", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setDraft(null);
      reload();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? "Erreur");
    }
  }

  async function del(d: Deal) {
    if (!confirm("Supprimer ce deal ?")) return;
    await fetch(`/api/admin/deals?id=${d.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Deals</h1>
        <button
          onClick={() => setDraft({ ...empty })}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Nouveau deal
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Route</th>
              <th className="px-4 py-2 font-medium">Prix</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2 font-medium">
                  {d.origin} → {d.destination}
                  {d.is_error_fare && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-700">
                      erreur de prix
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {d.price}€{" "}
                  {d.normal_price && (
                    <span className="text-slate-700">(-{d.discount_pct}%)</span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                  {d.published_at || d.created_at
                    ? new Date(
                        d.published_at ?? d.created_at
                      ).toLocaleDateString("fr-BE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </td>
                <td className="px-4 py-2">
                  {busyEmailId === d.id ? (
                    <span className="text-xs text-slate-700">génération...</span>
                  ) : d.email ? (
                    <button
                      onClick={() => setEmailDeal(d)}
                      className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                    >
                      Voir l&apos;email
                    </button>
                  ) : (
                    <button
                      onClick={() => genEmail(d)}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-200"
                    >
                      Générer
                    </button>
                  )}
                </td>
                <td className="px-4 py-2 text-right space-x-3">
                  <button
                    onClick={() => setDraft(d)}
                    className="text-brand hover:underline"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => del(d)}
                    className="text-red-600 hover:underline"
                  >
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-700">
                  Aucun deal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">
              {draft.id ? "Modifier" : "Nouveau"} deal
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <L label="Origine">
                <input
                  className="in"
                  value={draft.origin ?? ""}
                  onChange={(e) => setDraft({ ...draft, origin: e.target.value })}
                />
              </L>
              <L label="Destination">
                <input
                  className="in"
                  value={draft.destination ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, destination: e.target.value })
                  }
                />
              </L>
              <L label="Prix (€)">
                <input
                  type="number"
                  className="in"
                  value={draft.price ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, price: Number(e.target.value) })
                  }
                />
              </L>
              <L label="Prix normal (€)">
                <input
                  type="number"
                  className="in"
                  value={draft.normal_price ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, normal_price: Number(e.target.value) })
                  }
                />
              </L>
              <L label="Dates">
                <input
                  className="in"
                  value={draft.dates ?? ""}
                  onChange={(e) => setDraft({ ...draft, dates: e.target.value })}
                />
              </L>
              <L label="Compagnie">
                <input
                  className="in"
                  value={draft.airline ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, airline: e.target.value })
                  }
                />
              </L>
              <div className="sm:col-span-2">
                <L label="Lien de réservation">
                  <input
                    className="in"
                    value={draft.booking_url ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, booking_url: e.target.value })
                    }
                  />
                </L>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={draft.is_error_fare ?? false}
                  onChange={(e) =>
                    setDraft({ ...draft, is_error_fare: e.target.checked })
                  }
                />
                Erreur de prix (fault fare)
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDraft(null)}
                className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {emailDeal && emailDeal.email && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-bold">
                Email du deal : {emailDeal.origin} vers {emailDeal.destination}
              </h2>
              <button
                onClick={() => setEmailDeal(null)}
                className="text-slate-700 hover:text-slate-700"
              >
                Fermer
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-700">
              Généré le{" "}
              {new Date(emailDeal.email.generated_at).toLocaleString("fr-BE")}
            </p>

            <div className="mt-4 space-y-3">
              <CopyField label="Objet de l'email" value={emailDeal.email.subject} />
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Corps de l&apos;email
                  </span>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(emailDeal.email!.body)
                    }
                    className="text-xs text-brand hover:underline"
                  >
                    Copier
                  </button>
                </div>
                <textarea
                  readOnly
                  value={emailDeal.email.body}
                  rows={14}
                  className="in font-mono"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
              <a
                href={`/api/admin/deals/preview?id=${emailDeal.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Aperçu
              </a>
              <button
                onClick={() => sendDeal(emailDeal)}
                disabled={sending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {sending ? "Envoi..." : "Envoyer aux abonnés"}
              </button>
              <button
                onClick={() => setEmailDeal(null)}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .in {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          className="text-xs text-brand hover:underline"
        >
          Copier
        </button>
      </div>
      <input readOnly value={value} className="in" />
    </div>
  );
}
