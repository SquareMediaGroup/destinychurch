"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { adminSignIn, adminSignOut, requestSystemAccess } from "./actions";
import type { AdminRole } from "@/lib/roles";

const initialState = {
  success: false,
  error: undefined as string | undefined,
  email: undefined as string | undefined,
  roles: undefined as AdminRole[] | undefined,
};

type SystemCard = {
  href: string;
  icon: string;
  title: string;
  description: string;
  requiredRole: AdminRole;
  badge?: string;
};

const SYSTEMS: SystemCard[] = [
  {
    href: "/admin",
    icon: "design_services",
    title: "Site Editor",
    description:
      "Edit pages, sermons, banners and content across the public website.",
    requiredRole: "site_editor",
  },
  {
    href: "/administration",
    icon: "admin_panel_settings",
    title: "Administration",
    description:
      "Day-to-day church administration — people, teams and operations.",
    requiredRole: "administration",
    badge: "New",
  },
];

export default function AdminLoginClient({
  initialPhase = "login",
  initialEmail,
  initialRoles = [],
}: {
  initialPhase?: "login" | "choose";
  initialEmail?: string;
  initialRoles?: AdminRole[];
}) {
  const [state, formAction, pending] = useActionState(adminSignIn, initialState);
  const [phase, setPhase] = useState<"login" | "choose">(initialPhase);
  const [email, setEmail] = useState<string | undefined>(initialEmail);
  const [roles, setRoles] = useState<AdminRole[]>(initialRoles);
  const [signingOut, startSignOut] = useTransition();

  useEffect(() => {
    if (state.success) {
      setEmail(state.email);
      setRoles(state.roles ?? []);
      setPhase("choose");
    }
  }, [state.success, state.email, state.roles]);

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
              roles={roles}
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
  roles,
  onSignOut,
  signingOut,
}: {
  email?: string;
  roles: AdminRole[];
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
        {SYSTEMS.map((sys, i) => {
          const hasAccess = roles.includes(sys.requiredRole);
          const delay = { animationDelay: `${100 + i * 90}ms` };

          if (!hasAccess) {
            return <LockedSystemCard key={sys.href} sys={sys} style={delay} />;
          }

          return (
            <Link
              key={sys.href}
              href={sys.href}
              style={delay}
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
          );
        })}
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

// A system the user can't reach. Pristine by default (lock + "No access"); a
// click slides down an inline panel to request access, which emails the team.
function LockedSystemCard({
  sys,
  style,
}: {
  sys: SystemCard;
  style: React.CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | undefined>();
  const [sending, startSending] = useTransition();

  function sendRequest() {
    setStatus("idle");
    setErrorMsg(undefined);
    startSending(async () => {
      const res = await requestSystemAccess(sys.requiredRole);
      if (res.success) {
        setStatus("sent");
      } else {
        setStatus("error");
        setErrorMsg(res.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <div
      style={style}
      className="glass overflow-hidden rounded-3xl border border-white/10 animate-[fadeInUp_0.45s_ease-out_both]"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/5"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white/40">
          <span className="material-symbols-rounded text-[28px]">lock</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white/70">{sys.title}</h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
              No access
            </span>
          </div>
          <p className="mt-1 text-sm leading-snug text-white/35">
            You don&apos;t have permission for this system.
          </p>
        </div>
        <span
          className={`material-symbols-rounded text-white/25 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </button>

      {/* Inline slide-down — grid-rows trick keeps it smooth without a fixed height */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-white/10 px-5 pb-5 pt-4">
            {status === "sent" ? (
              <div className="flex items-start gap-3">
                <span className="material-symbols-rounded mt-0.5 text-destiny-orange">
                  mark_email_read
                </span>
                <div>
                  <p className="text-sm font-bold text-white">Request sent</p>
                  <p className="mt-1 text-sm leading-snug text-white/45">
                    The tech team will be in touch once access is granted.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-white">Access Restricted</p>
                <p className="mt-1 text-sm leading-snug text-white/45">
                  Would you like to request access to the {sys.title} panel?
                </p>
                {status === "error" && errorMsg && (
                  <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {errorMsg}
                  </p>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="rounded-2xl border border-white/15 px-4 py-2.5 text-sm font-bold text-white/60 transition hover:bg-white/5 hover:text-white/80"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={sendRequest}
                    disabled={sending}
                    className="rounded-2xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60"
                  >
                    {sending ? "Sending…" : "Send Request"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
