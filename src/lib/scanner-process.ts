// Gestion du script scanner Python depuis le back-office (LOCAL uniquement).
// Lance / arrête `python scripts/scanner.py` et capture ses logs en mémoire.
// Ne fonctionne que là où le serveur Next peut lancer un process (dev local,
// PC perso). Sur Vercel (serverless), ce n'est pas disponible.

import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { site } from "./site";

interface LogLine {
  t: string;
  line: string;
}

interface ScannerState {
  proc: ChildProcess | null;
  logs: LogLine[];
  startedAt: string | null;
  source: string;
}

// Persiste à travers le hot-reload du dev.
const g = globalThis as unknown as { __bvScanner?: ScannerState };
function state(): ScannerState {
  if (!g.__bvScanner) {
    g.__bvScanner = { proc: null, logs: [], startedAt: null, source: "rss" };
  }
  return g.__bvScanner;
}

const MAX_LOGS = 400;

function pushLog(s: ScannerState, line: string) {
  s.logs.push({ t: new Date().toISOString(), line });
  if (s.logs.length > MAX_LOGS) s.logs.splice(0, s.logs.length - MAX_LOGS);
}

function emit(s: ScannerState, chunk: Buffer, prefix = "") {
  String(chunk)
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "")
    .forEach((l) => pushLog(s, prefix + l));
}

export function isRunning(): boolean {
  const s = state();
  return !!(s.proc && !s.proc.killed && s.proc.exitCode === null);
}

export function getStatus() {
  const s = state();
  return {
    running: isRunning(),
    startedAt: s.startedAt,
    source: s.source,
    logs: s.logs,
  };
}

export function start(source: string): { ok: boolean; error?: string } {
  const s = state();
  if (isRunning()) return { ok: false, error: "Le scanner tourne déjà." };

  s.logs = [];
  s.startedAt = new Date().toISOString();
  s.source = source === "travelpayouts" ? "travelpayouts" : "rss";

  const pythonBin = process.env.PYTHON_BIN || "python";
  const script = path.join(process.cwd(), "scripts", "scanner.py");

  let proc: ChildProcess;
  try {
    proc = spawn(pythonBin, [script], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BONVOLEUR_URL: site.url,
        DEAL_SOURCE: s.source,
        PYTHONUNBUFFERED: "1", // logs en temps réel
        PYTHONIOENCODING: "utf-8", // évite les caractères cassés (é, €)
        PYTHONUTF8: "1",
      },
    });
  } catch (err) {
    pushLog(s, "Impossible de lancer Python: " + String(err));
    return { ok: false, error: "Impossible de lancer Python." };
  }

  s.proc = proc;
  pushLog(s, `Scanner démarré (source ${s.source}).`);

  proc.stdout?.on("data", (d: Buffer) => emit(s, d));
  proc.stderr?.on("data", (d: Buffer) => emit(s, d, "[err] "));
  proc.on("error", (err) =>
    pushLog(s, "Erreur process: " + err.message + " (Python est-il installé ?)")
  );
  proc.on("exit", (code) => {
    pushLog(s, `Scanner arrêté (code ${code ?? "?"}).`);
    s.proc = null;
  });

  return { ok: true };
}

export function stop(): { ok: boolean; error?: string } {
  const s = state();
  if (!isRunning()) return { ok: false, error: "Le scanner n'est pas en cours." };
  pushLog(s, "Arrêt demandé...");
  s.proc?.kill();
  return { ok: true };
}
