import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acces restreint",
  robots: { index: false, follow: false },
};

// Page de deverrouillage (verrou pre-lancement). Quand SITE_GATE_PASSWORD n'est
// plus defini, le proxy laisse tout passer et cette page n'est plus utilisee.
export default async function Acces({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold">
          BonVoleur<span className="text-brand">.com</span>
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Le site est en preparation. Entre le mot de passe d&apos;acces pour
          continuer.
        </p>
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Mot de passe incorrect.
          </p>
        )}
        <form method="post" action="/api/acces" className="mt-5 space-y-3">
          <input
            type="password"
            name="password"
            required
            autoFocus
            placeholder="Mot de passe"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark"
          >
            Entrer
          </button>
        </form>
      </div>
    </main>
  );
}
