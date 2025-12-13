"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "./Icon";
import GoogleLogo from "./GoogleLogo";
import { useToast } from "./ToastProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthFormProps = {
  mode: "login" | "signup";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === "login";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const toast = useToast();
  const sending = status === "sending";
  const sent = status === "sent";

  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch (err) {
      console.error("Supabase client unavailable", err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase is not configured. Add your project URL and anon key.");
    }
  }, [supabase]);

  const requestMagicLink = async () => {
    if (!supabase) return;
    if (!email.trim()) {
      setError("Enter an email address to get your sign-in link.");
      return;
    }
    setError(null);
    setStatus("sending");
    const emailValue = email.trim().toLowerCase();
    try {
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "";
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: emailValue,
        options: {
          emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
        },
      });
      if (signInError) throw signInError;
      setStatus("sent");
      toast.success(
        `We emailed a magic link to ${emailValue}.`,
        isLogin ? "Link sent" : "Welcome aboard",
      );
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Could not send a magic link. Try again.");
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const redirect = process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL;
    if (redirect) {
      window.location.href = redirect;
      return;
    }
    toast.info("Wire this button to your Google OAuth endpoint to redirect users.", "Google sign-in");
    setGoogleLoading(false);
  };

  const handleSendLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await requestMagicLink();
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-8 py-10 shadow-lg">
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold text-destiny-orange">
          {isLogin ? "Sign in" : "Create account"}
        </p>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Passwordless access</h1>
        <p className="text-sm text-destiny-grey">
          Use your email for a magic link or continue with Google.
        </p>
      </div>

      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] shadow-inner transition hover:border-destiny-orange hover:text-destiny-orange disabled:cursor-not-allowed disabled:opacity-70"
        >
          <GoogleLogo size={18} />
          {googleLoading ? "Preparing Google sign-in..." : "Continue with Google"}
        </button>

        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-destiny-grey/70">
          <span className="h-px flex-1 bg-[var(--border-subtle)]" />
          Or use a magic link
          <span className="h-px flex-1 bg-[var(--border-subtle)]" />
        </div>

        <form className="space-y-3" onSubmit={handleSendLink}>
          <label className="block space-y-1 text-sm font-semibold text-[var(--foreground)]">
            <span className="text-xs uppercase tracking-wide text-destiny-grey/80">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
              autoComplete={isLogin ? "email" : "new-email"}
            />
          </label>
          <button
            type="submit"
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-destiny-orange px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
          >
            <Icon name="send" size={18} className="text-white" />
            {sending ? "Sending link..." : isLogin ? "Email me a link" : "Send magic link"}
          </button>
        </form>

        {sent && (
          <p className="text-center text-[11px] font-semibold text-destiny-grey/80">
            Check your email for the link. You can close this tab once you&apos;re signed in.
          </p>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-inner">
            <Icon name="error" size={16} className="mt-[2px]" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-2 text-sm text-destiny-grey">
          <span>{isLogin ? "No account yet?" : "Already have an account?"}</span>
          <Link
            href={isLogin ? "/signup" : "/login"}
            className="font-semibold text-destiny-orange hover:underline"
          >
            {isLogin ? "Create one" : "Log in"}
          </Link>
        </div>
      </div>
    </div>
  );
}
