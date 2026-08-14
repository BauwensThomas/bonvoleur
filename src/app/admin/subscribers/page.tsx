import { getAll } from "@/lib/db";
import { listOrphanAuthUsers } from "@/lib/supabase/admin";
import SubscribersManager from "@/components/admin/SubscribersManager";

export default async function SubscribersAdmin() {
  const rows = await getAll("subscribers");
  const initial = [...rows].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );

  const orphans = await listOrphanAuthUsers(
    new Set(rows.map((r) => r.email.toLowerCase()))
  );
  orphans.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div>
      {orphans.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-900">
            {orphans.length} compte{orphans.length > 1 ? "s" : ""} connecté
            {orphans.length > 1 ? "s" : ""} sans inscription terminée
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Ces personnes se sont connectées (Google ou lien magique) mais
            n&apos;ont jamais fini <code>/compte/finaliser</code> (choix
            d&apos;aéroport + consentement) - elles n&apos;ont donc pas de
            ligne dans &quot;Abonnés&quot; ci-dessous et ne reçoivent rien.
          </p>
          <div className="mt-3 overflow-hidden rounded-xl border border-amber-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-amber-100/60 text-left text-amber-900">
                <tr>
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Créé le</th>
                  <th className="px-4 py-2 font-medium">Dernière connexion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {orphans.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-2 font-medium">
                      <a href={`mailto:${o.email}`} className="hover:underline">
                        {o.email}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(o.created_at).toLocaleDateString("fr-BE", {
                        timeZone: "Europe/Brussels",
                      })}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {o.last_sign_in_at
                        ? new Date(o.last_sign_in_at).toLocaleDateString(
                            "fr-BE",
                            { timeZone: "Europe/Brussels" }
                          )
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <SubscribersManager initial={initial} />
    </div>
  );
}
