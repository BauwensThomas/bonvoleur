import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoginForm from "@/components/LoginForm";
import ReviewForm from "@/components/ReviewForm";
import { getMemberState } from "@/lib/member-auth";
import { findOne } from "@/lib/db";

export const metadata: Metadata = {
  title: "Ton avis",
  robots: { index: false, follow: false },
};

export default async function Avis({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>;
}) {
  const { note } = await searchParams;
  const rating = Number(note);
  const validRating = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 5;
  const nextUrl = `/avis?note=${validRating}`;

  const member = await getMemberState();

  // Connecté (Google/lien magique) mais pas encore abonné - même parcours que
  // /compte, on finalise l'inscription avant de pouvoir laisser un avis.
  if (member.status === "no-account") {
    redirect("/compte/finaliser");
  }

  let content;
  if (member.status === "member") {
    const existing = await findOne(
      "reviews",
      (r) => r.subscriber_id === member.subscriber.id
    );
    content = existing ? (
      <>
        <h1 className="text-2xl font-bold">Tu as déjà laissé un avis</h1>
        <p className="mt-3 text-slate-600">
          Merci ! Un seul avis par compte. Pour le modifier, contacte-nous à{" "}
          <a href="mailto:contact@bonvoleur.com" className="text-brand underline">
            contact@bonvoleur.com
          </a>
          .
        </p>
      </>
    ) : (
      <ReviewForm initialRating={validRating} />
    );
  } else {
    content = (
      <>
        <h1 className="text-2xl font-bold">Connecte-toi pour laisser un avis</h1>
        <p className="mt-3 text-slate-600">
          Seuls les abonnés BonVoleur peuvent laisser un avis.
        </p>
        <LoginForm next={nextUrl} />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-lg px-4 py-16 text-center">
        {content}
      </main>
      <Footer />
    </>
  );
}
