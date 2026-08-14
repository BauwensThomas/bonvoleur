import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false, follow: false },
};

export default function MotDePasseOublie() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
        <p className="mt-3 text-slate-600">
          Entre ton email : on t&apos;enverra un lien pour choisir un nouveau
          mot de passe.
        </p>
        <ForgotPasswordForm />
      </main>
      <Footer />
    </>
  );
}
