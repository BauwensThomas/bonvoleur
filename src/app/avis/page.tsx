import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReviewForm from "@/components/ReviewForm";
import { findOne } from "@/lib/db";

export const metadata: Metadata = {
  title: "Ton avis",
  robots: { index: false, follow: false },
};

export default async function Avis({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; note?: string }>;
}) {
  const { token, note } = await searchParams;
  const rating = Number(note);
  const validRating = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;

  const sub = token ? await findOne("subscribers", (s) => s.unsubscribe_token === token) : null;

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        {sub && validRating ? (
          <ReviewForm token={token!} initialRating={validRating} />
        ) : (
          <>
            <h1 className="text-2xl font-bold">Lien invalide</h1>
            <p className="mt-3 text-slate-600">
              Ce lien n&apos;est plus valide. Tu peux nous laisser un avis
              directement depuis ton prochain email BonVoleur.
            </p>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
