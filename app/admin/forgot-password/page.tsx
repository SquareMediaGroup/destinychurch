"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { requestPasswordReset } from "./actions";

const initialState = {
  success: false,
  error: undefined as string | undefined,
  message: undefined as string | undefined,
};

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-destiny-grey">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/img/photos/Hero%20BKG.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-destiny-grey/90" />

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-4 pt-32 pb-16">
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

          {/* Heading */}
          <div className="mb-8 text-center">
            <span className="mb-3 inline-block rounded-full bg-destiny-orange/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Reset Password
            </span>
            <h1 className="text-3xl font-black text-white md:text-4xl">
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm text-white/40">
              Enter your email address and we&apos;ll send you a link to reset it.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
            {state.message ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl bg-green-500/10 px-4 py-3">
                  <span className="material-symbols-rounded mt-0.5 text-green-400">
                    check_circle
                  </span>
                  <p className="text-sm text-green-400">{state.message}</p>
                </div>
                <p className="text-center text-xs text-white/40">
                  Didn&apos;t receive an email? Check your spam folder or try a different email address.
                </p>
                <Link
                  href="/admin-login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-destiny-orange px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
                >
                  <span className="material-symbols-rounded text-base">
                    arrow_back
                  </span>
                  Back to login
                </Link>
              </div>
            ) : (
              <form action={formAction} className="flex flex-col gap-5">
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                    Email address
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

                {state.error && (
                  <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <span className="material-symbols-rounded text-base">
                      error
                    </span>
                    {state.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-1 rounded-2xl bg-destiny-orange px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Send reset link"}
                </button>

                <Link
                  href="/admin-login"
                  className="rounded-2xl border border-white/10 px-6 py-3.5 text-center text-sm font-bold text-white/60 transition hover:bg-white/5"
                >
                  Back to login
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
