import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Maintenance en cours",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-slate-900">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <Image
            src="/logo.svg"
            alt="BonVoleur"
            width={58}
            height={44}
            className="h-11 w-auto"
            priority
          />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-brand">
          BonVoleur<span className="text-slate-900">.com</span>
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
          On revient très vite.
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg leading-8 text-slate-600">
          Le site est temporairement indisponible pour une maintenance de nos
          services. Nous serons de retour le 17 septembre 2026.
        </p>
        <div className="mx-auto mt-8 h-1 w-16 rounded-full bg-brand" />
        <p className="mt-6 text-sm text-slate-500">
          Merci pour ta patience et bon voyage.
        </p>
      </div>
    </main>
  );
}