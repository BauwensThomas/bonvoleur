import { getAll } from "@/lib/db";

// Affiche dynamiquement les partenaires actifs, triés par position.
export default async function Partners() {
  const all = await getAll("partners");
  const partners = all
    .filter((p) => p.is_active)
    .sort((a, b) => a.position - b.position);

  if (partners.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
          Nos partenaires voyage
        </h2>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {partners.map((p) => (
            <a
              key={p.id}
              href={p.affiliate_url || p.url}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="flex w-full flex-col rounded-xl border border-slate-200 p-4 transition hover:border-brand hover:shadow-sm sm:w-72"
            >
              <span className="text-xs uppercase tracking-wide text-slate-400">
                {p.category}
              </span>
              <span className="mt-1 font-semibold">{p.name}</span>
              <span className="mt-1 text-sm text-slate-600">
                {p.description}
              </span>
            </a>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">
          Certains liens sont des liens partenaires (affiliation).
        </p>
      </div>
    </section>
  );
}
