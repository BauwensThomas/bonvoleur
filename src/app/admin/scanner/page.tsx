import { getScannerRuns } from "@/lib/github-actions";
import ScannerControls from "@/components/admin/ScannerControls";

export const dynamic = "force-dynamic";

function statusBadge(run: { status: string; conclusion: string | null }) {
  if (run.status !== "completed") {
    return { label: "En cours", cls: "bg-sky-100 text-sky-700" };
  }
  if (run.conclusion === "success") {
    return { label: "Succès", cls: "bg-emerald-100 text-emerald-700" };
  }
  if (run.conclusion === "failure") {
    return { label: "Échec", cls: "bg-red-100 text-red-700" };
  }
  return { label: run.conclusion ?? "?", cls: "bg-slate-100 text-slate-600" };
}

export default async function ScannerAdmin() {
  const { configured, repo, runs, error } = await getScannerRuns();

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold">Scanner</h1>
        <p className="mt-1 text-sm text-slate-500">
          Le scanner tourne sur <strong>GitHub Actions</strong> (3 fois par jour)
          et écrit les deals directement dans Supabase. Voici l&apos;historique
          de ses exécutions.
        </p>
      </div>

      {!configured ? (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Pour afficher l&apos;historique, définis <code>GITHUB_REPO</code> (ex.
          <code> BauwensThomas/bonvoleur</code>) et <code>GITHUB_TOKEN</code> (un
          jeton GitHub avec la permission <em>Actions: read</em>) dans les
          variables d&apos;environnement. En attendant, consulte l&apos;onglet
          Actions sur GitHub.
        </div>
      ) : (
        <>
          <div className="mt-5">
            <ScannerControls />
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Erreur GitHub : {error}
            </p>
          )}

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Run</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Déclencheur</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                      Aucune exécution pour le moment.
                    </td>
                  </tr>
                ) : (
                  runs.map((r) => {
                    const b = statusBadge(r);
                    return (
                      <tr key={r.id}>
                        <td className="px-4 py-2 text-slate-700">#{r.runNumber}</td>
                        <td className="px-4 py-2 text-slate-600">
                          {new Date(r.createdAt).toLocaleString("fr-BE")}
                        </td>
                        <td className="px-4 py-2 text-slate-500">
                          {r.event === "schedule" ? "Planifié" : "Manuel"}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${b.cls}`}>
                            {b.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <a
                            href={r.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand hover:underline"
                          >
                            Voir le log
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {repo && (
            <p className="mt-3 text-xs text-slate-400">
              Dépôt : {repo} · workflow scanner-feed.yml
            </p>
          )}
        </>
      )}
    </div>
  );
}
