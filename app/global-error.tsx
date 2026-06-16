"use client";

import { useEffect } from "react";

// global-error replaces the root layout, so it must render its own <html>/<body>.
// It only fires when the root layout itself throws.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("🛑 Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "1rem",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#363f48",
          background: "#fff",
        }}
      >
        <h1 style={{ fontSize: "1.875rem", fontWeight: 900, marginBottom: "1rem" }}>
          Something went wrong
        </h1>
        <p style={{ maxWidth: "28rem", marginBottom: "2rem", opacity: 0.7 }}>
          Sorry, the page failed to load. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: "9999px",
            background: "#f58021",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.875rem",
            padding: "0.75rem 1.5rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
