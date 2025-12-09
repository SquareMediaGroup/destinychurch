"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { submitReport, ReportFormState } from "@/app/sermons/view/actions";
import { useToast } from "./ToastProvider";

type ReportIssueFormProps = {
  sermonId: string;
  sermonTitle: string;
};

const initialState: ReportFormState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-destiny-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-60"
    >
      {pending ? "Sending..." : "Report an issue"}
    </button>
  );
}

export default function ReportIssueForm({ sermonId, sermonTitle }: ReportIssueFormProps) {
  const [state, formAction] = useFormState(submitReport, initialState);
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast.success("Thanks — we'll review this report.");
      formRef.current?.reset();
    }
    if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [state, toast]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Report AI content</p>
          <p className="text-xs text-destiny-grey/80">
            Found an issue with this summary or transcript? Let us know.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
          <span className="text-xs uppercase tracking-wide text-destiny-grey/80">Name</span>
          <input
            name="name"
            required
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
            placeholder="Your name"
          />
        </label>
        <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
          <span className="text-xs uppercase tracking-wide text-destiny-grey/80">Email</span>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
            placeholder="you@example.com"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
          <span className="text-xs uppercase tracking-wide text-destiny-grey/80">Description</span>
          <textarea
            name="description"
            required
            rows={3}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
            placeholder="Tell us what seems incorrect or missing."
          />
        </label>
        <label className="space-y-1 text-sm font-semibold text-[var(--foreground)]">
          <span className="text-xs uppercase tracking-wide text-destiny-grey/80">Area</span>
          <select
            name="issueType"
            required
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/30"
          >
            <option value="summary">Summary</option>
            <option value="transcript">Transcript</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <input type="hidden" name="sermonId" value={sermonId} />
      <input type="hidden" name="sermonTitle" value={sermonTitle} />

      <SubmitButton />
    </form>
  );
}
