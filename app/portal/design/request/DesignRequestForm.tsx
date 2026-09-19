"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { submitDesignRequest } from "./actions";
import { DESIGN_CATEGORY_LABELS, type DesignTicketCategory } from "@/lib/designTickets";
import Button from "@/components/ui/Button";

const FIELD =
  "w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20";
const LABEL = "mb-1.5 block text-sm font-bold text-destiny-grey";

const CATEGORIES = Object.entries(DESIGN_CATEGORY_LABELS) as [
  DesignTicketCategory,
  string,
][];

export interface DesignRequestFormProps {
  /** Prefilled from the staff record. */
  defaultName?: string;
  defaultEmail?: string;
}

export default function DesignRequestForm({
  defaultName = "",
  defaultEmail = "",
}: DesignRequestFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ token?: string; ref?: number }>({});
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const res = await submitDesignRequest(new FormData(e.currentTarget));

    if (res.success) {
      setResult({ token: res.token, ref: res.ref });
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
          You&apos;re signed in, so this one is fast-tracked. We&apos;ve emailed you a link to
          follow it.
        </p>

        {result.token ? (
          <Button href={`/design-request/${result.token}`} size="lg" className="mt-6">
            Track this request
          </Button>
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
      <p className="flex items-center gap-2 rounded-2xl bg-destiny-orange/10 px-4 py-3 text-sm font-bold text-destiny-orange">
        <span className="material-symbols-rounded text-lg">bolt</span>
        You&apos;re signed in — this request will be fast-tracked.
      </p>

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
          defaultValue={defaultEmail}
          className={FIELD}
          placeholder="you@example.com"
        />
        <p className="mt-1.5 text-xs text-destiny-grey/50">
          We&apos;ll send your tracking link here, so make sure it&apos;s one you check.
        </p>
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

      <Button type="submit" size="md" fullWidth loading={status === "loading"}>
        {status === "loading" ? "Sending…" : "Send request"}
      </Button>
    </form>
  );
}
