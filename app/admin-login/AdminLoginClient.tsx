"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { adminSignIn, adminSignOut } from "./actions";

const initialState = {
  success: false,
  error: undefined as string | undefined,
  email: undefined as string | undefined,
};

type SystemCard = {
  href: string;
  icon: string;
  title: string;
  description: string;
  badge?: string;
};

const SYSTEMS: SystemCard[] = [
  {
    href: "/admin",
    icon: "design_services",
    title: "Site Editor",
    description:
      "Edit pages, sermons, banners and content across the public website.",
  },
  {
    href: "/administration",
    icon: "admin_panel_settings",
    title: "Administration",
    description:
      "Day-to-day church administration — people, teams and operations.",
    badge: "New",
  },
];

export default function AdminLoginClient({
  initialPhase = "login",
  initialEmail,
}: {
  initialPhase?: "login" | "choose";
  initialEmail?: string;
}) {
  const [state, formAction, pending] = useActionState(adminSignIn, initialState);
  const [phase, setPhase] = useState<"login" | "choose">(initialPhase);
  const [email, setEmail] = useState<string | undefined>(initialEmail);
  const [signingOut, startSignOut] = useTransition();

  useEffect(() => {
    if (state.success) {
      setEmail(state.email);
      setPhase("choose");
    }
  }, [state.success, state.email]);

  function handleSignOut() {
    startSignOut(async () => {
      await adminSignOut();
      setEmail(undefined);
      setPhase("login");
    });
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-destiny-grey">
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

          {phase === "login" ? (
            <LoginPanel
              formAction={formAction}
              pending={pending}
              error={state.error}
            />
          ) : (
            <ChoosePanel
              email={email}
              onSignOut={handleSignOut}
              signingOut={signingOut}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function LoginPanel({
  formAction,
  pending,
  error,
}: {
  formAction: (formData: FormData) => void;
  pending: boolean;
  error?: string;
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
          Sign in to continue to your systems
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

function ChoosePanel({
  email,
  onSignOut,
  signingOut,
}: {
  email?: string;
  onSignOut: () => void;
  signingOut: boolean;
}) {
  return (
    <div className="animate-[fadeInUp_0.4s_ease-out_both]">
      {/* Heading */}
      <div className="mb-8 text-center">
        <span className="mb-3 inline-block rounded-full bg-destiny-orange/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-destiny-orange">
          Choose a system
        </span>
        <h1 className="text-3xl font-black text-white md:text-4xl">
          Where to next?
        </h1>
        {email && (
          <p className="mt-2 text-sm text-white/40">
            Signed in as <span className="text-white/70">{email}</span>
          </p>
        )}
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4">
        {SYSTEMS.map((sys, i) => (
          <Link
            key={sys.href}
            href={sys.href}
            style={{ animationDelay: `${100 + i * 90}ms` }}
            className="glass group flex items-center gap-4 rounded-3xl border border-white/10 p-5 transition animate-[fadeInUp_0.45s_ease-out_both] hover:border-destiny-orange/40 hover:bg-white/10"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/15 text-destiny-orange transition group-hover:bg-destiny-orange group-hover:text-white">
              <span className="material-symbols-rounded text-[28px]">
                {sys.icon}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">{sys.title}</h2>
                {sys.badge && (
                  <span className="rounded-full bg-destiny-orange/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destiny-orange">
                    {sys.badge}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm leading-snug text-white/45">
                {sys.description}
              </p>
            </div>
            <span className="material-symbols-rounded text-white/25 transition group-hover:translate-x-1 group-hover:text-destiny-orange">
              chevron_right
            </span>
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="text-xs font-bold uppercase tracking-wider text-white/40 transition hover:text-white/70 disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
