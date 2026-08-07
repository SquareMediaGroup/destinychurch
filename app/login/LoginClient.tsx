"use client";

import { useActionState, useEffect, useRef, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { adminSignIn } from "./actions";

const initialState = {
  success: false,
  error: undefined as string | undefined,
};

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function LoginClient() {
  const [state, formAction, pending] = useActionState(adminSignIn, initialState);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  const renderTurnstile = () => {
    if (!TURNSTILE_SITE_KEY || !turnstileRef.current || !window.turnstile) return;
    turnstileRef.current.innerHTML = "";
    widgetId.current = window.turnstile.render(turnstileRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
    });
  };

  // Tokens are single-use — reset the widget after a failed attempt so the
  // next submission gets a fresh one.
  useEffect(() => {
    if (state.error && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
  }, [state.error]);

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-destiny-grey">
      {TURNSTILE_SITE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={renderTurnstile}
        />
      )}
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/img/photos/Hero%20BKG.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/65 to-destiny-grey/90" />

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 py-20">
        <div className="w-full max-w-md">
          {/* Logo */}
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

          <LoginPanel formAction={formAction} pending={pending} error={state.error} turnstileRef={turnstileRef} />
        </div>
      </div>
    </div>
  );
}

function LoginPanel({
  formAction,
  pending,
  error,
  turnstileRef,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
  turnstileRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="animate-[fadeInUp_0.4s_ease-out_both]">
      {/* Heading */}
      <div className="mb-8 text-center">
        <span className="mb-3 inline-block rounded-full bg-destiny-orange/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-destiny-orange">
          Staff Sign-In
        </span>
        <h1 className="text-3xl font-black text-white md:text-4xl">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-white/40">
          Sign in to continue to the dashboard
        </p>
      </div>

      {/* Card */}
      <div className="glass rounded-3xl p-8">
        <form action={formAction} className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
              Email
            </label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white placeholder:text-white/20 transition focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-white/40">
                Password
              </label>
              <Link
                href="/admin/forgot-password"
                className="text-xs font-bold text-destiny-orange hover:brightness-110"
              >
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white placeholder:text-white/20 transition focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm text-white/60">
            <input
              type="checkbox"
              name="remember"
              defaultChecked
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-destiny-orange accent-destiny-orange focus:ring-2 focus:ring-destiny-orange/20 focus:ring-offset-0"
            />
            Keep me signed in
          </label>

          <div ref={turnstileRef} className="flex justify-center" />

          {error && (
            <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <span className="material-symbols-rounded text-base">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 rounded-2xl bg-destiny-orange px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
