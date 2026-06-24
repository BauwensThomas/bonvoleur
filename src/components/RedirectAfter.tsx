"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirige vers `to` après `seconds` secondes (utilisé après confirmation
// d'inscription pour renvoyer vers la connexion).
export default function RedirectAfter({
  to,
  seconds,
}: {
  to: string;
  seconds: number;
}) {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.push(to), seconds * 1000);
    return () => clearTimeout(t);
  }, [router, to, seconds]);
  return null;
}
