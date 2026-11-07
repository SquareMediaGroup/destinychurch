// Second step for website admins: the 6-digit code from their authenticator
// app (see lib/session.tsx). Backup codes and setting up a new app happen on
// the website, so this screen points there for both.

import { useState } from "react";
import { errorText } from "@/lib/api";
import { useSession } from "@/lib/session";
import { AuthFrame } from "@/features/auth/SignIn";

export function TwoFactor() {
  const session = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthFrame>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length !== 6 || busy) return;
          setBusy(true);
          setError(null);
          session
            .verifyTwoFactor(code)
            .catch((err: unknown) => {
              setError(errorText(err));
              setCode("");
            })
            .finally(() => setBusy(false));
        }}
        style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Two-factor sign-in</h1>
          <p className="muted" style={{ fontSize: 14, lineHeight: "20px" }}>
            Enter the 6-digit code for Destiny Church from your authenticator app.
          </p>
        </div>
        <label className="field" style={{ width: "100%" }}>
          <span>6-digit code</span>
          <input
            className="input"
            inputMode="numeric"
            autoFocus
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{ height: 52, borderRadius: 9, fontSize: 26, fontWeight: 600, letterSpacing: 14, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn dark lg" type="submit" disabled={code.length !== 6 || busy}>
          {busy ? "Checking…" : "Continue"}
        </button>
        <p className="subtle" style={{ fontSize: 12, lineHeight: "18px" }}>
          Lost your phone? Sign in on the website (destinytees.uk/login) with a backup code to set up a new one.
        </p>
        <button type="button" className="btn ghost" onClick={() => void session.signOut()}>Sign out</button>
      </form>
    </AuthFrame>
  );
}
