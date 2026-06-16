import { getAll } from "@/lib/db";
import { agents } from "@/lib/agents";
import RunAgentButton from "@/components/admin/RunAgentButton";
import AgentRunsHistory from "@/components/admin/AgentRunsHistory";

export default async function AgentsAdmin() {
  const runs = await getAll("agent_runs");
  const history = [...runs].sort((a, b) =>
    b.started_at.localeCompare(a.started_at)
  );

  function lastRun(name: string) {
    return history.find((r) => r.agent_name === name);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Agents</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ce que fait chaque agent, comment le lancer, et l&apos;historique de ses
        exécutions.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
        {agents.map((a) => {
          const last = lastRun(a.name);
          return (
            <div
              key={a.name}
              className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{a.label}</h2>
                  <p className="mt-0.5 text-sm font-medium text-slate-500">
                    {a.role}
                  </p>
                </div>
                {a.appButton && <RunAgentButton name={a.name} />}
              </div>
              <p className="mt-3 text-sm text-slate-600">{a.description}</p>
              <div className="mt-auto pt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span className="rounded bg-slate-100 px-2 py-0.5">
                  {a.cadence}
                </span>
                {last && (
                  <span>
                    Dernier run : {new Date(last.started_at).toLocaleString("fr-BE")}{" "}
                    ({last.status})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Historique des exécutions</h2>
      <p className="mt-1 text-sm text-slate-500">
        Filtre par agent, par date ou par un mot du résumé.
      </p>
      <div className="mt-3">
        <AgentRunsHistory runs={history} />
      </div>
    </div>
  );
}
