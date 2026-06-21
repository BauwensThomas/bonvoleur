// Accès à l'historique du scanner qui tourne sur GitHub Actions.
// Requiert GITHUB_REPO (ex "BauwensThomas/bonvoleur") + GITHUB_TOKEN (PAT avec
// "Actions: read", et "write" si on veut déclencher un run depuis l'admin).

const GH_API = "https://api.github.com";
const WORKFLOW_FILE = "scanner-feed.yml";

export interface WorkflowRun {
  id: number;
  status: string; // queued | in_progress | completed
  conclusion: string | null; // success | failure | cancelled | null
  createdAt: string;
  htmlUrl: string;
  event: string; // schedule | workflow_dispatch
  runNumber: number;
}

export interface ScannerRuns {
  configured: boolean;
  repo: string | null;
  runs: WorkflowRun[];
  total: number; // nombre TOTAL d'exécutions (au-delà de la liste récupérée)
  error?: string;
}

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function mapRun(r: unknown): WorkflowRun {
  const w = r as Record<string, unknown>;
  return {
    id: Number(w.id),
    status: String(w.status),
    conclusion: w.conclusion ? String(w.conclusion) : null,
    createdAt: String(w.created_at),
    htmlUrl: String(w.html_url),
    event: String(w.event),
    runNumber: Number(w.run_number),
  };
}

// allPages=false (dashboard) : 1 appel, on lit juste le total_count.
// allPages=true (page Scanner) : pagine pour récupérer TOUTES les exécutions
// (borné par la rétention GitHub ~90 jours, donc pas réellement infini).
export async function getScannerRuns(allPages = false): Promise<ScannerRuns> {
  const repo = process.env.GITHUB_REPO ?? null;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return { configured: false, repo, runs: [], total: 0 };

  const MAX_PAGES = 20; // garde-fou (jusqu'a 2000 runs)
  try {
    const all: WorkflowRun[] = [];
    let total = 0;
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const res = await fetch(
        `${GH_API}/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=100&page=${page}`,
        { headers: ghHeaders(token), cache: "no-store" }
      );
      if (!res.ok) {
        if (page === 1) {
          return { configured: true, repo, runs: [], total: 0, error: `GitHub ${res.status}` };
        }
        break;
      }
      const data = (await res.json()) as {
        workflow_runs?: unknown[];
        total_count?: number;
      };
      if (page === 1) total = data.total_count ?? 0;
      const batch = (data.workflow_runs ?? []).map(mapRun);
      all.push(...batch);
      if (!allPages || batch.length < 100) break;
    }
    return { configured: true, repo, runs: all, total: total || all.length };
  } catch (err) {
    return {
      configured: true,
      repo,
      runs: [],
      total: 0,
      error: err instanceof Error ? err.message : "Erreur GitHub",
    };
  }
}

// Nettoie un log brut GitHub Actions pour un rendu type console :
// retire l'horodatage ISO, les codes couleur ANSI et les marqueurs ##[...].
function cleanLog(raw: string): string {
  const ansi = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");
  return raw
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z\s?/, "")
        .replace(ansi, "")
        .replace(/^##\[(group|endgroup|command|section|warning|error)\]/, "")
    )
    .join("\n");
}

// Récupère le log complet d'un run (toutes ses étapes), comme dans un terminal.
export async function getRunLog(
  runId: string
): Promise<{ ok: boolean; log: string; error?: string }> {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return { ok: false, log: "", error: "GitHub non configuré." };

  try {
    const jr = await fetch(
      `${GH_API}/repos/${repo}/actions/runs/${runId}/jobs`,
      { headers: ghHeaders(token), cache: "no-store" }
    );
    if (!jr.ok) return { ok: false, log: "", error: `jobs ${jr.status}` };
    const jobs = ((await jr.json()) as { jobs?: { id: number; name: string }[] }).jobs ?? [];

    let out = "";
    for (const job of jobs) {
      const lr = await fetch(
        `${GH_API}/repos/${repo}/actions/jobs/${job.id}/logs`,
        { headers: ghHeaders(token), cache: "no-store" }
      );
      if (!lr.ok) {
        out += `\n[log "${job.name}" indisponible : ${lr.status}]\n`;
        continue;
      }
      out += cleanLog(await lr.text());
    }
    return { ok: true, log: out.trim() || "(log vide)" };
  } catch (err) {
    return { ok: false, log: "", error: err instanceof Error ? err.message : "Erreur GitHub" };
  }
}

// Déclenche un run du scanner (workflow_dispatch). Nécessite un token "Actions: write".
export async function triggerScannerRun(): Promise<{ ok: boolean; error?: string }> {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return { ok: false, error: "GITHUB_REPO / GITHUB_TOKEN non configurés." };

  const res = await fetch(
    `${GH_API}/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "master" }),
    }
  );
  if (res.status === 204) return { ok: true };
  return { ok: false, error: `GitHub ${res.status}: ${await res.text()}` };
}
