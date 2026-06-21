import { getScannerRuns } from "@/lib/github-actions";
import ScannerControls from "@/components/admin/ScannerControls";
import ScannerRunsTable from "@/components/admin/ScannerRunsTable";

export const dynamic = "force-dynamic";

export default async function ScannerAdmin() {
  const { configured, repo, runs, total, error } = await getScannerRuns(true);

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

          <p className="mt-5 text-sm font-semibold text-slate-700">
            Historique des exécutions ({total} au total)
          </p>
          <ScannerRunsTable runs={runs} />

          <p className="mt-3 text-xs text-slate-700">
            Fais défiler la liste pour voir les exécutions plus anciennes.
            Clique sur un run pour dérouler son log complet.
          </p>

          {repo && (
            <p className="mt-3 text-xs text-slate-700">
              Dépôt : {repo} · workflow scanner-feed.yml
            </p>
          )}
        </>
      )}
    </div>
  );
}
