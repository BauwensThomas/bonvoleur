import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { airports } from "@/lib/site";
import { getMemberState } from "@/lib/member-auth";

export const metadata: Metadata = {
  title: "Finalise ton inscription",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Étape finale pour un utilisateur authentifié (Google / magic link) pas encore
// abonné : choisir l'aéroport + consentir. Soumet vers /api/member/finalize.
export default async function Finaliser({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const member = await getMemberState();

  // Déjà membre, ou pas connecté : /compte gère (dashboard ou connexion).
  if (member.status !== "no-account") {
    redirect("/compte");
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-xl px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Plus qu&apos;une étape</h1>
          <p className="mt-2 text-sm text-slate-600">
            Connecté en tant que <strong>{member.email}</strong>. Choisis ton
            aéroport de départ pour recevoir les bons plans qui te concernent.
          </p>

          {error === "1" && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              Choisis un aéroport et accepte les conditions pour continuer.
            </p>
          )}

          <form
            action="/api/member/finalize"
            method="post"
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="home_airport"
                className="mb-1 block text-sm font-medium"
              >
                Ton aéroport de départ
              </label>
              <select
                id="home_airport"
                name="home_airport"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5"
              >
                <option value="">Choisis ton aéroport</option>
                {airports.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.city} ({a.iata})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Gratuit : 1 aéroport, 1 email par semaine. Premium : plusieurs
                aéroports, 1 email par jour.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                name="consent"
                type="checkbox"
                required
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>
                J&apos;accepte de recevoir les alertes deals, la newsletter, et la{" "}
                <a href="/confidentialite" className="underline">
                  politique de confidentialité
                </a>
                .
              </span>
            </label>

            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-3 font-semibold text-white transition hover:bg-brand-dark"
            >
              Accéder à mes bons plans
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
