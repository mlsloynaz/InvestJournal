"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", background: "#f5f0e6" }}>
        <h1 style={{ color: "#0f2744" }}>Error en InvestJournal</h1>
        <p style={{ fontSize: "0.875rem", color: "#333" }}>{error.message}</p>
        <button type="button" onClick={reset} style={{ marginTop: "1rem" }}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
