import { headers } from "next/headers";
import { getAll } from "@/lib/db";

function refcc(acceptLang: string): "fr" | "be" {
  const lang = acceptLang.toLowerCase();
  if (lang.includes("fr-fr") || lang.includes("fr-ch")) return "fr";
  return "be"; // fr-BE, fr, et tout le reste → Belgique par défaut
}

function localizeUrl(url: string, cc: "fr" | "be"): string {
  if (!url) return url;
  // Kiwitaxi : remplace refcc= par le bon code pays
  if (url.includes("kiwitaxi.com")) {
    return url.replace(/refcc=[a-z]+/i, `refcc=${cc}`);
  }
  return url;
}

// Affiche dynamiquement les partenaires actifs, triés par position.
export default async function Partners() {
  const all = await getAll("partners");
  const hdrs = await headers();
  const cc = refcc(hdrs.get("accept-language") ?? "");
  const partners = all
    .filter((p) => p.is_active)
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      ...p,
      affiliate_url: localizeUrl(p.affiliate_url || p.url, cc),
    }));

  if (partners.length === 0) return null;

  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">
          Nos partenaires voyage
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          {partners.map((p) => (
            <a
              key={p.id}
              href={p.affiliate_url || p.url}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="group flex w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg sm:w-72"
            >
              {p.logo ? (
                <span className="mb-3 flex h-10 items-center self-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.logo}
                    alt={`Logo ${p.name}`}
                    width="150"
                    height="40"
                    className="max-h-10 w-auto max-w-37.5 object-contain transition duration-300 [@media(hover:hover)]:opacity-80 [@media(hover:hover)]:grayscale [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:grayscale-0"
                  />
                </span>
              ) : null}
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
                {p.category}
              </span>
              <span className="mt-1 font-semibold">{p.name}</span>
              <span className="mt-1 text-sm text-slate-600">
                {p.description}
              </span>
            </a>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-600">
          Certains liens sont des liens partenaires (affiliation).
        </p>
      </div>
    </section>
  );
}
