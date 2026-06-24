import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PreferencesForm from "@/components/PreferencesForm";
import DeleteAccountButton from "@/components/DeleteAccountButton";
import { getMemberState } from "@/lib/member-auth";
import type { EmailFrequency } from "@/lib/types";

export const metadata: Metadata = {
  title: "Mes préférences",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Preferences() {
  const member = await getMemberState();
  // Réservé aux abonnés confirmés. Sinon, /compte gère l'état (connexion,
  // inscription, confirmation).
  if (member.status !== "member") {
    redirect("/compte");
  }

  const initialFrequency: EmailFrequency =
    member.subscriber.email_frequency ??
    (member.tier === "premium" ? "daily" : "weekly");

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Mes préférences</h1>
          <Link
            href="/compte"
            className="text-sm font-medium text-brand hover:text-brand-dark"
          >
            Retour à mes bons plans
          </Link>
        </div>
        <p className="mt-1 text-slate-600">
          Connecté en tant que <strong>{member.email}</strong> · compte{" "}
          {member.tier === "premium" ? "premium" : "gratuit"}.
        </p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <PreferencesForm
            tier={member.tier}
            initialAirports={member.subscriber.home_airports ?? []}
            initialFrequency={initialFrequency}
            initialNewsletter={member.subscriber.newsletter !== false}
          />
        </div>

        {/* Zone de danger : suppression définitive du compte. */}
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50/40 p-6">
          <h2 className="font-semibold text-slate-900">Supprimer mon compte</h2>
          <p className="mt-1 text-sm text-slate-600">
            Efface définitivement ton compte et tes données. Un abonnement premium
            est résilié immédiatement (sans remboursement de la période en cours).
            Action irréversible.
          </p>
          <div className="mt-3">
            <DeleteAccountButton />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
