"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function AirportToggleBtn({
  iata,
  active,
}: {
  iata: string;
  active: boolean;
}) {
  const [on, setOn] = useState(active);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function toggle() {
    const next = !on;
    setOn(next);
    const res = await fetch("/api/admin/airports/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ iata, active: next }),
    });
    if (!res.ok) {
      setOn(!next); // rollback
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={on ? "Désactiver cet aéroport" : "Activer cet aéroport"}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        on ? "bg-brand" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
