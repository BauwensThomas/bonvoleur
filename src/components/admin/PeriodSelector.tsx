"use client";

import { useRouter, usePathname } from "next/navigation";

const OPTIONS = [
  { label: "7 jours", value: 7 },
  { label: "30 jours", value: 30 },
  { label: "60 jours", value: 60 },
  { label: "90 jours", value: 90 },
];

export default function PeriodSelector({ days }: { days: number }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => router.push(`${pathname}?days=${o.value}`)}
          className={`px-3 py-1.5 text-sm font-medium transition ${
            days === o.value
              ? "bg-brand text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
