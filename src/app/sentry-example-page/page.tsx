"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";

// Page de verification manuelle Sentry (equivalent de celle generee par
// l'assistant officiel, jamais lance ici car le SDK etait deja en place
// depuis l'integration GlitchTip). A supprimer une fois la capture
// confirmee dans Sentry -> Issues.
export default function SentryExamplePage() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  async function trigger() {
    Sentry.captureException(new Error("Erreur de test Sentry (côté client)"));
    await fetch("/api/sentry-example-api").catch(() => {});
    await Sentry.flush(2000);
    setStatus("sent");
  }

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>Test Sentry</h1>
      <button
        onClick={trigger}
        style={{
          padding: "12px 24px",
          background: "#0ea5e9",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        Déclencher une erreur de test
      </button>
      {status === "sent" && (
        <p style={{ marginTop: 20, color: "#15803d", fontWeight: 600 }}>
          Erreurs envoyées (client + serveur) - vérifie Sentry → Issues.
        </p>
      )}
    </div>
  );
}
