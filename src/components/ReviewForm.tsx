"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewForm({
  token,
  initialRating,
}: {
  token: string;
  initialRating: number;
}) {
  const [rating, setRating] = useState(initialRating);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.push("/"), 5000);
    return () => clearTimeout(t);
  }, [done, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ton nom est requis.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rating, name, comment }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Une erreur est survenue.");
        return;
      }
      setDone(true);
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <>
        <h1 className="text-2xl font-bold">Merci pour ton avis !</h1>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Ton avis compte</h1>
      <p className="mt-3 text-slate-600">
        Combien d&apos;étoiles nous donnes-tu ? Clique pour changer ta note.
      </p>
      <div className="mt-4 flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            className="cursor-pointer text-4xl leading-none transition-transform hover:scale-110"
            style={{ color: n <= rating ? "#f59e0b" : "#e2e8f0" }}
          >
            ★
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3 text-left">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700">
            Ton prénom
          </label>
          <p className="mt-0.5 text-xs text-slate-400">
            Juste ton prénom, pas de nom de famille (affiché publiquement sur le site).
          </p>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton prénom"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
        </div>
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-slate-700">
            Un commentaire ? (optionnel)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 150))}
            maxLength={150}
            rows={4}
            placeholder="Qu'est-ce que tu penses de BonVoleur ?"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {comment.length}/150
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={sending}
          className="mt-2 rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {sending ? "Envoi..." : "Envoyer mon avis"}
        </button>
      </form>
    </>
  );
}
