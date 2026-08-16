"use client";

// Page de verification manuelle Sentry (equivalent de celle generee par
// l'assistant officiel, jamais lance ici car le SDK etait deja en place
// depuis l'integration GlitchTip). A supprimer une fois la capture
// confirmee dans Sentry -> Issues.
export default function SentryExamplePage() {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <h1>Test Sentry</h1>
      <button
        onClick={async () => {
          await fetch("/api/sentry-example-api").catch(() => {});
          throw new Error("Erreur de test Sentry (cote client)");
        }}
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
    </div>
  );
}
