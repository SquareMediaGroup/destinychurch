"use client";

import { useActionState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { resetPassword } from "./actions";

const initialState = { success: false, error: undefined as string | undefined };

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  useEffect(() => {
    if (state.success) {
      router.push("/admin-login");
    }
  }, [state.success, router]);

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
              Set New Password
            </span>
            <h1 className="text-3xl font-black text-white md:text-4xl">
              Create a new password
            </h1>
            <p className="mt-2 text-sm text-white/40">
              Enter a strong password to secure your admin account.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
            <form action={formAction} className="flex flex-col gap-5">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                  New password
                </label>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-white placeholder:text-white/20 transition focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">
                  Confirm password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  placeholder="Confirm your password"
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
                {pending ? "Resetting password…" : "Reset password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
