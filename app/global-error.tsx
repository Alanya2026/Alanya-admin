"use client";

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa", color: "#18181b" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: 0 }}>Une erreur critique est survenue</h1>
          <p style={{ fontSize: "0.875rem", color: "#71717a", marginTop: "0.5rem" }}>
            L&apos;application n&apos;a pas pu démarrer. Rechargez la page.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#a1a1aa", fontFamily: "monospace", marginTop: "0.5rem" }}>
              Réf. {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem", padding: "0.5rem 1rem", borderRadius: "0.5rem",
              border: "1px solid #e4e4e7", background: "#fff", cursor: "pointer", fontSize: "0.875rem",
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
