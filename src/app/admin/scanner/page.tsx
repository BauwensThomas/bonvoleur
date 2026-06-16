"use client";

import { useEffect, useRef, useState } from "react";

interface LogLine {
  t: string;
  line: string;
}
interface Status {
  running: boolean;
  startedAt: string | null;
  source: string;
  logs: LogLine[];
}

export default function ScannerAdmin() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/admin/scanner/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      /* ignore */
    }
  }

  // Poll toutes les 2 secondes pour voir les logs en direct.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll vers le bas quand de nouveaux logs arrivent.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [status?.logs.length]);

  async function start() {
    setBusy(true);
    await fetch("/api/admin/scanner/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "travelpayouts" }),
    });
    setBusy(false);
    refresh();
  }

  async function stop() {
    setBusy(true);
    await fetch("/api/admin/scanner/stop", { method: "POST" });
    setBusy(false);
    refresh();
  }

  const running = status?.running ?? false;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scanner</h1>
          <p className="mt-1 text-sm text-slate-500">
            Lance le script qui scanne les bons plans et les pousse au site.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            running
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {running ? "En cours" : "Arrêté"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
          Source : Travelpayouts
        </span>

        {running ? (
          <button
            onClick={stop}
            disabled={busy}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Arrêter
          </button>
        ) : (
          <button
            onClick={start}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Démarrer
          </button>
        )}

        {status?.startedAt && (
          <span className="text-xs text-slate-500">
            Démarré : {new Date(status.startedAt).toLocaleString("fr-BE")}
          </span>
        )}
      </div>

      {/* Console live */}
      <div
        ref={logRef}
        className="mt-4 h-[420px] overflow-y-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-slate-100"
      >
        {status && status.logs.length > 0 ? (
          status.logs.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap">
              <span className="text-slate-500">
                {new Date(l.t).toLocaleTimeString("fr-BE")}{" "}
              </span>
              <span
                className={
                  l.line.startsWith("[err]") ? "text-red-400" : undefined
                }
              >
                {l.line}
              </span>
            </div>
          ))
        ) : (
          <p className="text-slate-500">
            Aucune sortie pour le moment. Clique sur Démarrer.
          </p>
        )}
      </div>

      <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
        Fonctionne en local (le serveur lance Python sur cette machine). Il faut
        Python installé et <code>pip install -r scripts/requirements.txt</code>.
        En production sur Vercel, lance plutôt le script sur un PC allumé 24/7.
      </div>
    </div>
  );
}
