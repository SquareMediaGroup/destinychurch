"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { submitDesignRequest } from "./actions";
import { DESIGN_CATEGORY_LABELS, type DesignTicketCategory } from "@/lib/designTickets";

const FIELD =
  "w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20";
const LABEL = "mb-1.5 block text-sm font-bold text-destiny-grey";

const CATEGORIES = Object.entries(DESIGN_CATEGORY_LABELS) as [
  DesignTicketCategory,
  string,
][];

export interface DesignRequestFormProps {
  /** Prefilled from the session when there is one. */
  defaultName?: string;
  defaultEmail?: string;
  signedIn: boolean;
  /** Signed in, but no staff record and no admin role — priority won't apply. */
  unmatched?: boolean;
}

export default function DesignRequestForm({
  defaultName = "",
  defaultEmail = "",
  signedIn,
  unmatched = false,
}: DesignRequestFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ token?: string; ref?: number; fast?: boolean }>({});
  const [email, setEmail] = useState(defaultEmail);
  const formRef = useRef<HTMLFormElement>(null);

  // The nudge, not a gate. A staff address typed while signed out is still a
  // real request from a real person — we just can't prove it's them, so it
  // goes in at normal priority rather than being turned away.
  const looksLikeStaff = !signedIn && /@destinytees\.uk\s*$/i.test(email);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const res = await submitDesignRequest(new FormData(e.currentTarget));

    if (res.success) {
      setResult({ token: res.token, ref: res.ref, fast: res.fastTracked });
      setStatus("success");
      formRef.current?.reset();
    } else {
      setStatus("error");
      setErrorMsg(res.error ?? "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm">
        <span className="material-symbols-rounded mb-2 block text-4xl text-green-600">
          check_circle
        </span>
        <p className="text-xl font-black text-destiny-grey">Request received</p>
        {result.ref ? (
          <p className="mt-1 text-sm font-bold text-destiny-orange">
            DT-{String(result.ref).padStart(4, "0")}
          </p>
        ) : null}
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-destiny-grey/60">
          {result.fast
            ? "You're signed in, so this one is fast-tracked. We've emailed you a link to follow it."
            : "We've emailed you a link so you can follow it and download the finished files."}
        </p>

        {result.token ? (
          <Link
            href={`/design-request/${result.token}`}
            className="mt-6 inline-block rounded-full bg-destiny-orange px-8 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
          >
            Track this request
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 block w-full text-sm font-bold text-destiny-grey/50 transition hover:text-destiny-grey"
        >
          Ask for something else
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {signedIn && !unmatched ? (
        <p className="flex items-center gap-2 rounded-2xl bg-destiny-orange/10 px-4 py-3 text-sm font-bold text-destiny-orange">
          <span className="material-symbols-rounded text-lg">bolt</span>
          You&apos;re signed in — this request will be fast-tracked.
        </p>
      ) : null}

      {unmatched ? (
        <p className="rounded-2xl bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey/70">
          You&apos;re signed in, but we couldn&apos;t match you to a staff record — your request
          will come through as normal priority. Ask HR to link your account if that&apos;s not right.
        </p>
      ) : null}

      <div>
        <label className={LABEL} htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={200}
          defaultValue={defaultName}
          className={FIELD}
          placeholder="Jo Bloggs"
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={FIELD}
          placeholder="you@example.com"
        />
        <p className="mt-1.5 text-xs text-destiny-grey/50">
          We&apos;ll send your tracking link here, so make sure it&apos;s one you check.
        </p>

        {looksLikeStaff ? (
          <div className="mt-3 rounded-2xl border border-destiny-orange/20 bg-destiny-orange/5 px-4 py-3">
            <p className="text-sm font-bold text-destiny-grey">That looks like a staff address</p>
            <p className="mt-1 text-sm text-destiny-grey/60">
              Sign in and we&apos;ll fast-track your request. You can still send it without
              signing in — it&apos;ll just join the normal queue.
            </p>
            <Link
              href="/login?next=/design-request"
              className="mt-2 inline-block text-sm font-bold text-destiny-orange underline"
            >
              Sign in
            </Link>
          </div>
        ) : null}
      </div>

      <div>
        <label className={LABEL} htmlFor="phone">
          Phone <span className="font-normal text-destiny-grey/40">(optional)</span>
        </label>
        <input id="phone" name="phone" maxLength={40} className={FIELD} />
      </div>

      <div>
        <label className={LABEL} htmlFor="title">
          What do you need?
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          className={FIELD}
          placeholder="Poster for the youth night"
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="category">
          What kind of thing is it?
        </label>
        <select id="category" name="category" defaultValue="other" className={`${FIELD} appearance-none`}>
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL} htmlFor="brief">
          Tell us about it
        </label>
        <textarea
          id="brief"
          name="brief"
          required
          rows={5}
          maxLength={5000}
          className={`${FIELD} resize-none`}
          placeholder="What's it for, who's it aimed at, what needs to be on it, and anything that has to be exactly right."
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="needed_by">
          Needed by <span className="font-normal text-destiny-grey/40">(optional)</span>
        </label>
        <input id="needed_by" name="needed_by" type="date" className={FIELD} />
      </div>

      <div>
        <label className={LABEL} htmlFor="specs">
          Sizes, formats, where it&apos;s going{" "}
          <span className="font-normal text-destiny-grey/40">(optional)</span>
        </label>
        <textarea
          id="specs"
          name="specs"
          rows={3}
          maxLength={2000}
          className={`${FIELD} resize-none`}
          placeholder="A5 flyer, plus something square for Instagram."
        />
      </div>

      {/* Honeypot. Hidden from people and from screen readers; a bot fills it. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
          {errorMsg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-full bg-destiny-orange py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60"
      >
        {status === "loading" ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
