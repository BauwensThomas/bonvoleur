import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
};

export default function ReinitialiserMotDePasse() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Choisis un nouveau mot de passe</h1>
        <ResetPasswordForm />
      </main>
      <Footer />
    </>
  );
}
