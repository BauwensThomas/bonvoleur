"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ScannerControls() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/scanner/run", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMsg("Scan déclenché. Il apparaîtra dans l'historique dans quelques secondes.");
        setTimeout(() => router.refresh(), 6000);
      } else {
        setMsg(`Échec : ${data.error ?? "erreur inconnue"}`);
      }
    } catch {
      setMsg("Échec de l'appel.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? "..." : "Lancer un scan"}
      </button>
      <button
        onClick={() => router.refresh()}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:border-slate-400"
      >
        Rafraîchir
      </button>
      {msg && <span className="text-sm text-slate-600">{msg}</span>}
    </div>
  );
}
