"use client";

// The second step of an admin sign-in (see app/login/2fa/page.tsx).
//
//   verify  → 6-digit code from the authenticator app
//   backup  → one of the 8 backup codes instead; it removes the old app, so
//             it carries straight on into setup
//   setup   → QR code (or the key typed in), then a code to confirm it
//   codes   → the 8 backup codes, shown once, and "I've saved these" to go on

import { useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { backupCodesFile } from "@/lib/twoFactor";

type Mode = "verify" | "backup" | "setup" | "codes";

interface Enrolment {
  factorId: string;
  qrCode: string;
  secret: string;
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-white placeholder:text-white/20 transition focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20";
const primaryClass =
  "w-full rounded-2xl bg-destiny-orange px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60";
const linkClass = "text-sm font-bold text-destiny-orange hover:brightness-110";

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) throw new Error(json?.error ?? "Something went wrong. Please try again.");
  return json as T;
}

export default function TwoFactorClient({
  initialMode,
  factorId: initialFactorId,
  email,
  next,
}: {
  initialMode: "verify" | "setup";
  factorId: string | null;
  email: string;
  next: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [factorId] = useState(initialFactorId);
  const [notice, setNotice] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const goNext = () => window.location.assign(next);

  return (
    <Shell email={email}>
      {mode === "verify" && factorId && (
        <VerifyPanel
          factorId={factorId}
          onDone={goNext}
          onUseBackup={() => setMode("backup")}
        />
      )}
      {mode === "backup" && (
        <BackupPanel
          onDone={() => {
            setNotice("Backup code accepted. Your old authenticator app has been removed: set up a new one now.");
            setMode("setup");
          }}
          onBack={() => setMode("verify")}
        />
      )}
      {mode === "setup" && (
        <SetupPanel
          notice={notice}
          onDone={(codes) => {
            setBackupCodes(codes);
            setMode("codes");
          }}
        />
      )}
      {mode === "codes" && <CodesPanel codes={backupCodes} email={email} onDone={goNext} />}
    </Shell>
  );
}

function Shell({ email, children }: { email: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-destiny-grey">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/img/photos/Hero%20BKG.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/65 to-destiny-grey/90" />
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-10 flex justify-center">
            <div className="relative h-10 w-[190px]">
              <Image
                src="/img/brand/destiny-logo-color-white.svg"
                alt="Destiny Church"
                fill
                priority
                sizes="190px"
                className="object-contain"
              />
            </div>
          </div>
          {children}
          <form action="/api/admin/logout" method="POST" className="mt-8 text-center">
            <p className="text-xs text-on-dark-subtle">
              Signed in as <span className="text-on-dark-muted">{email}</span>
            </p>
            <button type="submit" className="mt-2 text-xs font-bold text-white/50 transition hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Heading({ badge, title, children }: { badge: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-8 text-center">
      <span className="mb-3 inline-block rounded-full bg-destiny-orange/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-destiny-orange">
        {badge}
      </span>
      <h1 className="text-3xl font-black text-white md:text-4xl">{title}</h1>
      {children && <p className="mt-2 text-sm leading-relaxed text-on-dark-subtle">{children}</p>}
    </div>
  );
}

function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center gap-3 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
      <span className="material-symbols-rounded text-base" aria-hidden="true">error</span>
      {message}
    </div>
  );
}

function CodeInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-dark-subtle">
        6-digit code
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="000000"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em] tabular-nums`}
      />
    </div>
  );
}

function VerifyPanel({
  factorId,
  onDone,
  onUseBackup,
}: {
  factorId: string;
  onDone: () => void;
  onUseBackup: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/mfa/verify", { factorId, code });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work.");
      setCode("");
      setBusy(false);
    }
  }

  return (
    <div className="animate-[fadeInUp_0.4s_ease-out_both]">
      <Heading badge="Two-factor sign-in" title="Enter your code">
        Open your authenticator app and enter the 6-digit code for Destiny Church.
      </Heading>
      <form onSubmit={submit} className="glass flex flex-col gap-5 rounded-3xl p-8">
        <CodeInput id="mfa-code" value={code} onChange={setCode} />
        <ErrorNote message={error} />
        <button type="submit" disabled={busy || code.length !== 6} className={primaryClass}>
          {busy ? "Checking..." : "Continue"}
        </button>
        <button type="button" onClick={onUseBackup} className={linkClass}>
          Lost your phone? Use a backup code
        </button>
      </form>
    </div>
  );
}

function BackupPanel({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await post("/api/auth/mfa/recover", { code });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That backup code didn't work.");
      setBusy(false);
    }
  }

  return (
    <div className="animate-[fadeInUp_0.4s_ease-out_both]">
      <Heading badge="Two-factor sign-in" title="Use a backup code">
        Enter one of the backup codes you saved when you set up two-factor sign-in. Each code works
        once, and you will set up your authenticator app again straight after.
      </Heading>
      <form onSubmit={submit} className="glass flex flex-col gap-5 rounded-3xl p-8">
        <div>
          <label htmlFor="mfa-backup" className="mb-2 block text-xs font-bold uppercase tracking-wider text-on-dark-subtle">
            Backup code
          </label>
          <input
            id="mfa-backup"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 24))}
            className={`${inputClass} text-center font-mono text-lg tracking-wider`}
          />
        </div>
        <ErrorNote message={error} />
        <button type="submit" disabled={busy || !code.trim()} className={primaryClass}>
          {busy ? "Checking..." : "Use backup code"}
        </button>
        <button type="button" onClick={onBack} className={linkClass}>
          Back to authenticator code
        </button>
        <p className="text-center text-xs leading-relaxed text-on-dark-subtle">
          No codes either? Ask a Super Admin to reset your two-factor sign-in.
        </p>
      </form>
    </div>
  );
}

function SetupPanel({ notice, onDone }: { notice: string | null; onDone: (codes: string[]) => void }) {
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      setEnrolment(await post<Enrolment>("/api/auth/mfa/enroll"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start set-up.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (!enrolment || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await post<{ backupCodes?: string[] }>("/api/auth/mfa/verify", {
        factorId: enrolment.factorId,
        code,
      });
      onDone(res.backupCodes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work.");
      setCode("");
      setBusy(false);
    }
  }

  if (!enrolment) {
    return (
      <div className="animate-[fadeInUp_0.4s_ease-out_both]">
        <Heading badge="Two-factor sign-in" title="Protect your account">
          Admin accounts now need a code from an authenticator app as well as a password. It takes
          about two minutes, and you only set it up once.
        </Heading>
        <div className="glass flex flex-col gap-5 rounded-3xl p-8">
          {notice && (
            <div className="rounded-2xl bg-destiny-orange/10 px-4 py-3 text-sm text-destiny-orange">{notice}</div>
          )}
          <ol className="flex flex-col gap-3 text-sm text-on-dark-muted">
            <li className="flex gap-3">
              <Step n={1} />
              <span>
                Install an authenticator app on your phone. We recommend{" "}
                <strong className="text-white">Bitwarden Authenticator</strong> (free). Google
                Authenticator, Microsoft Authenticator and 1Password work too.
              </span>
            </li>
            <li className="flex gap-3">
              <Step n={2} />
              <span>Scan the QR code on the next screen and type in the code it shows.</span>
            </li>
            <li className="flex gap-3">
              <Step n={3} />
              <span>Save your 8 backup codes somewhere safe. They are only shown once.</span>
            </li>
          </ol>
          <ErrorNote message={error} />
          <button type="button" onClick={start} disabled={busy} className={primaryClass}>
            {busy ? "Starting..." : "Set up two-factor sign-in"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-[fadeInUp_0.4s_ease-out_both]">
      <Heading badge="Two-factor sign-in" title="Scan the QR code">
        In your authenticator app, add a new account and scan this code.
      </Heading>
      <form onSubmit={confirm} className="glass flex flex-col gap-5 rounded-3xl p-8">
        <div className="mx-auto rounded-2xl bg-white p-3">
          {/* Supabase returns the QR code as an SVG data URI. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={enrolment.qrCode} alt="QR code for your authenticator app" width={192} height={192} />
        </div>
        {showKey ? (
          <div className="text-center">
            <p className="text-xs text-on-dark-subtle">Enter this key in your app instead:</p>
            <p className="mt-1 select-all break-all font-mono text-sm tracking-wider text-white">{enrolment.secret}</p>
          </div>
        ) : (
          <button type="button" onClick={() => setShowKey(true)} className={linkClass}>
            Can&apos;t scan it? Show the key
          </button>
        )}
        <CodeInput id="mfa-setup-code" value={code} onChange={setCode} />
        <ErrorNote message={error} />
        <button type="submit" disabled={busy || code.length !== 6} className={primaryClass}>
          {busy ? "Checking..." : "Confirm and turn on"}
        </button>
      </form>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destiny-orange/15 text-xs font-bold text-destiny-orange">
      {n}
    </span>
  );
}

function BackupCodeList({ codes }: { codes: string[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 rounded-2xl bg-black/30 p-4 font-mono text-sm tracking-wide text-white">
      {codes.map((c) => (
        <li key={c} className="text-center">
          {c}
        </li>
      ))}
    </ul>
  );
}

function CodesPanel({ codes, email, onDone }: { codes: string[]; email: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  function download() {
    const blob = new Blob([backupCodesFile(codes, email)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "destiny-church-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="animate-[fadeInUp_0.4s_ease-out_both]">
      <Heading badge="Two-factor is on" title="Save your backup codes">
        If you lose your phone, each of these gets you in once. This is the only time they are
        shown, so save them now: a note in Bitwarden, or printed and kept somewhere safe.
      </Heading>
      <div className="glass flex flex-col gap-5 rounded-3xl p-8">
        {codes.length > 0 ? (
          <BackupCodeList codes={codes} />
        ) : (
          <ErrorNote message="Your backup codes couldn't be shown. Make new ones from your profile page." />
        )}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={copy}
            className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={download}
            className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/15"
          >
            Download
          </button>
        </div>
        <label className="flex items-start gap-2.5 text-sm text-on-dark-muted">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => setSaved(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-destiny-orange"
          />
          I&apos;ve saved these codes somewhere safe
        </label>
        <button type="button" onClick={onDone} disabled={!saved} className={primaryClass}>
          Continue
        </button>
      </div>
    </div>
  );
}
