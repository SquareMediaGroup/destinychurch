"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileGateProps = {
  siteKey: string;
  verifyEndpoint?: string;
  storageKey?: string;
};

type TurnstileRenderOptions = {
  sitekey: string;
  theme?: "auto" | "light" | "dark";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

type TurnstileAPI = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

export default function TurnstileGate({
  siteKey,
  verifyEndpoint = "/api/turnstile/verify",
  storageKey = "turnstile-verified",
}: TurnstileGateProps) {
  const [verified, setVerified] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "verifying" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored === "1") {
      setVerified(true);
    }
  }, [storageKey]);

  const handleSuccess = async (token: string) => {
    setStatus("verifying");
    setErrorMessage(null);
    try {
      const response = await fetch(verifyEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (data?.success) {
        window.sessionStorage.setItem(storageKey, "1");
        setVerified(true);
        return;
      }
      throw new Error("Verification failed");
    } catch (error) {
      console.error("Turnstile verification error", error);
      setStatus("error");
      setErrorMessage("We couldn’t verify the challenge. Please try again.");
      if (widgetIdRef.current && window.turnstile?.reset) {
        window.turnstile.reset(widgetIdRef.current);
      }
    }
  };

  useEffect(() => {
    if (!ready || verified || !widgetRef.current || !window.turnstile) return;
    if (widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(widgetRef.current, {
      sitekey: siteKey,
      theme: "auto",
      callback: handleSuccess,
      "expired-callback": () => {
        setStatus("idle");
        setErrorMessage("Session expired. Please complete the challenge again.");
      },
      "error-callback": () => {
        setStatus("error");
        setErrorMessage("We couldn’t load the challenge. Please refresh.");
      },
    });
  }, [ready, verified, siteKey]);

  if (!siteKey || verified) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-sm text-[var(--foreground)] shadow-xl">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Quick security check
        </p>
        <p className="mt-1 text-xs text-destiny-grey">
          This helps keep the site safe and fast for everyone.
        </p>
        <div className="mt-4" ref={widgetRef} />
        {status === "verifying" ? (
          <p className="mt-3 text-xs text-destiny-grey">Verifying…</p>
        ) : null}
        {errorMessage ? (
          <p className="mt-3 text-xs text-destiny-red">{errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
