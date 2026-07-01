"use client";

import { useRouter, usePathname } from "next/navigation";

const PERIODS = [
  { label: "7 j", value: 7 },
  { label: "30 j", value: 30 },
  { label: "60 j", value: 60 },
  { label: "90 j", value: 90 },
];

export default function PeriodSelector({
  days,
  source,
}: {
  days: number;
  source?: string;
}) {
  const router   = useRouter();
  const pathname = usePathname();

  function go(nextDays: number, nextSource: string) {
    router.push(`${pathname}?days=${nextDays}&source=${nextSource}`);
  }

  const src = source ?? "supabase";

  return (
    <div className="flex flex-col gap-2 items-end shrink-0">
      {/* Toggle source */}
      <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden text-sm">
        {(["supabase", "travelpayouts"] as const).map((s) => (
          <button
            key={s}
            onClick={() => go(days, s)}
            className={`px-3 py-1.5 font-medium transition ${
              src === s ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s === "supabase" ? "Nos scans" : "Travelpayouts"}
          </button>
        ))}
      </div>

      {/* Sélecteur de période */}
      <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden text-sm">
        {PERIODS.map((o) => (
          <button
            key={o.value}
            onClick={() => go(o.value, src)}
            className={`px-3 py-1.5 font-medium transition ${
              days === o.value ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
