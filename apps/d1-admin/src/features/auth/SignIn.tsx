// Sign in: email one-time code (as in the phone app) or email and password.
// No ChurchSuite button on the Mac; staff use either of these.

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/Icon";
import { errorText } from "@/lib/api";
import { useSession } from "@/lib/session";

type Step = "welcome" | "email" | "code" | "password";

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="drag" data-tauri-drag-region style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 24px", background: "var(--grouped)" }}>
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center", gap: 24, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, background: "var(--orange)", color: "var(--on-orange)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "var(--shadow)" }}>
          <Icon name="chat" size={36} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function SignIn() {
  const session = useSession();
  const [step, setStep] = useState<Step>("welcome");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());

  const sendCode = (e?: FormEvent) => {
    e?.preventDefault();
    if (!emailOk) return;
    void run(async () => {
      await session.requestCode(email);
      setCode("");
      setResendIn(45);
      go("code");
    });
  };

  return (
    <AuthFrame>
      {step === "welcome" && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>D1 Admin</h1>
            <p className="muted" style={{ fontSize: 15, lineHeight: "21px" }}>Destiny One for leaders and admins, on your Mac.</p>
          </div>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn dark lg" onClick={() => go("email")}>Continue with email</button>
            <button className="btn lg" onClick={() => go("password")}>Sign in with a password</button>
          </div>
          <p className="subtle" style={{ fontSize: 12 }}>Use the email the church office has for you.</p>
        </>
      )}

      {step === "email" && (
        <form onSubmit={sendCode} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Your email</h1>
            <p className="muted" style={{ fontSize: 14, lineHeight: "20px" }}>We'll send you a 6-digit code.</p>
          </div>
          <label className="field" style={{ width: "100%" }}>
            <span>Email</span>
            <input className="input lg" type="email" autoFocus autoComplete="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn dark lg" type="submit" disabled={!emailOk || busy}>{busy ? "Sending…" : "Send code"}</button>
          <button type="button" className="btn ghost" onClick={() => go("welcome")}>Back</button>
        </form>
      )}

      {step === "code" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6) void run(() => session.verifyCode(email, code));
          }}
          style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Enter code</h1>
            <p className="muted" style={{ fontSize: 14, lineHeight: "20px" }}>Sent to {email.trim().toLowerCase()}</p>
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
          <button className="btn dark lg" type="submit" disabled={code.length !== 6 || busy}>{busy ? "Checking…" : "Verify"}</button>
          <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
            <button type="button" className="btn ghost" onClick={() => go("email")}>Change email</button>
            {resendIn > 0 ? (
              <span className="subtle" style={{ padding: "6px 0" }}>Resend code in 0:{String(resendIn).padStart(2, "0")}</span>
            ) : (
              <button type="button" className="btn ghost" onClick={() => sendCode()}>Resend code</button>
            )}
          </div>
        </form>
      )}

      {step === "password" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (emailOk && password) void run(() => session.signInWithPassword(email, password));
          }}
          style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Sign in</h1>
          <label className="field" style={{ width: "100%" }}>
            <span>Email</span>
            <input className="input lg" type="email" autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field" style={{ width: "100%" }}>
            <span>Password</span>
            <input className="input lg" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn dark lg" type="submit" disabled={!emailOk || !password || busy} style={{ marginTop: 8 }}>{busy ? "Signing in…" : "Sign in"}</button>
          <div style={{ display: "flex", gap: 16 }}>
            <button type="button" className="btn ghost" onClick={() => go("email")}>Email me a code instead</button>
            <button type="button" className="btn ghost" onClick={() => go("welcome")}>Back</button>
          </div>
        </form>
      )}
    </AuthFrame>
  );
}
