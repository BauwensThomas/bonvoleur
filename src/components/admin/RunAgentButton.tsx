"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RunAgentButton({ name }: { name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    await fetch("/api/admin/agents/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="rounded-lg border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white transition disabled:opacity-60"
    >
      {loading ? "..." : "Lancer"}
    </button>
  );
}
