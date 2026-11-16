"use client";

import { useState } from "react";
import type { ArticleIdea, ArticleIdeaStatus } from "@/lib/types";

const STATUS_LABELS: Record<ArticleIdeaStatus, string> = {
  pending: "En attente",
  processing: "En cours",
  done: "Terminée",
  skipped: "Ignorée",
  error: "Erreur",
};

const STATUS_STYLES: Record<ArticleIdeaStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-sky-100 text-sky-800",
  done: "bg-green-100 text-green-800",
  skipped: "bg-slate-100 text-slate-600",
  error: "bg-red-100 text-red-700",
};

const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm";

const EMPTY_FORM = {
  instructions: "",
  source_urls: "",
  link_url: "",
  link_label: "",
  photo_url: "",
  photo_credit: "",
  review_first: true,
};

export default function ArticleIdeasManager({ initial }: { initial: ArticleIdea[] }) {
  const [items, setItems] = useState<ArticleIdea[]>(initial);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function reload() {
    const res = await fetch("/api/admin/article-ideas");
    if (res.ok) setItems(await res.json());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/admin/article-ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage((await res.json().catch(() => null))?.error ?? "Erreur à l'enregistrement.");
      return;
    }
    setForm(EMPTY_FORM);
    setMessage("Idée ajoutée. Elle sera traitée au prochain passage de l'agent.");
    reload();
  }

  async function setStatus(i: ArticleIdea, status: ArticleIdeaStatus) {
    await fetch("/api/admin/article-ideas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: i.id, status }),
    });
    reload();
  }

  async function generateNow(i: ArticleIdea) {
    if (!confirm("Générer l'article maintenant ? Cela prend 1 à 3 minutes.")) return;
    setBusyId(i.id);
    setMessage("Génération en cours, ne ferme pas la page...");
    const res = await fetch("/api/admin/article-ideas/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: i.id }),
    });
    const data = await res.json().catch(() => null);
    setBusyId(null);
    setMessage(res.ok ? data?.summary ?? "Article généré." : `Échec : ${data?.error ?? "erreur inconnue"}`);
    reload();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Idées d&apos;articles</h1>
      <p className="mt-1 text-sm text-slate-500">
        Les idées en attente passent AVANT le sujet automatique : au prochain passage de l&apos;agent (tous les 3 jours),
        la plus ancienne est rédigée. Les sources sont lues pour s&apos;en inspirer, jamais recopiées.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium">
          Consigne (ton prompt)
          <textarea
            required
            rows={5}
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="Ex : un article sur le temps réel de visite en city break selon l'aéroport et les horaires de vol, avec nos aéroports de départ."
            className={field}
          />
        </label>
        <label className="block text-sm font-medium">
          Liens de sources à lire pour s&apos;inspirer (un par ligne, facultatif)
          <textarea
            rows={2}
            value={form.source_urls}
            onChange={(e) => setForm({ ...form, source_urls: e.target.value })}
            className={field}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Lien à citer dans le texte (facultatif)
            <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} className={field} />
          </label>
          <label className="block text-sm font-medium">
            Nom du site cité (ancre du lien)
            <input value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} className={field} />
          </label>
          <label className="block text-sm font-medium">
            Lien de la photo (téléchargée et hébergée chez toi, facultatif)
            <input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} className={field} />
          </label>
          <label className="block text-sm font-medium">
            Crédit de la photo
            <input value={form.photo_credit} onChange={(e) => setForm({ ...form, photo_credit: e.target.value })} className={field} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.review_first}
            onChange={(e) => setForm({ ...form, review_first: e.target.checked })}
          />
          Créer en brouillon à relire (rien n&apos;est publié ni envoyé aux réseaux avant ton feu vert)
        </label>
        <div className="flex items-center gap-3">
          <button
            disabled={saving}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Ajouter l'idée"}
          </button>
          {message && <span className="text-sm text-slate-600">{message}</span>}
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {items.length === 0 && <p className="text-sm text-slate-400">Aucune idée pour l&apos;instant.</p>}
        {items.map((i) => (
          <div key={i.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[i.status]}`}>
                {STATUS_LABELS[i.status]}
              </span>
              {i.review_first && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Brouillon à relire</span>
              )}
              <span className="text-xs text-slate-400">{new Date(i.created_at).toLocaleDateString("fr-BE")}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{i.instructions}</p>
            {i.link_url && (
              <p className="mt-2 text-xs text-slate-500">
                Lien cité :{" "}
                <a href={i.link_url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                  {i.link_label || i.link_url}
                </a>
              </p>
            )}
            {i.source_urls.length > 0 && (
              <p className="mt-1 break-all text-xs text-slate-400">Sources : {i.source_urls.join(" ; ")}</p>
            )}
            {i.photo_url && (
              <p className="mt-1 text-xs text-slate-400">
                Photo hébergée{i.photo_credit ? `, crédit ${i.photo_credit}` : ""}
              </p>
            )}
            {i.note && <p className="mt-2 text-xs font-medium text-amber-700">{i.note}</p>}
            {i.post_slug && (
              <p className="mt-2 text-xs">
                <a href="/admin/blog" className="font-semibold text-brand hover:underline">
                  Voir dans le blog admin
                </a>{" "}
                ({i.post_slug})
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {(i.status === "pending" || i.status === "error") && (
                <button
                  onClick={() => generateNow(i)}
                  disabled={busyId === i.id}
                  className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800 hover:bg-green-200 disabled:opacity-50"
                >
                  {busyId === i.id ? "Génération..." : "Générer maintenant"}
                </button>
              )}
              {i.status === "pending" && (
                <button
                  onClick={() => setStatus(i, "skipped")}
                  className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                >
                  Ignorer
                </button>
              )}
              {(i.status === "skipped" || i.status === "error" || i.status === "processing") && (
                <button
                  onClick={() => setStatus(i, "pending")}
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Remettre en attente
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
