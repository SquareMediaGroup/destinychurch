"use client";

import { useEffect, useState } from "react";
import ReportIssueForm from "./ReportIssueForm";

type IssueType = "summary" | "transcript" | "other";

type ReportIssueLauncherProps = {
  sermonId: string;
  sermonTitle: string;
  issueType?: IssueType;
  label?: string;
};

export default function ReportIssueLauncher({
  sermonId,
  sermonTitle,
  issueType = "summary",
  label = "Report",
}: ReportIssueLauncherProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
      >
        {label}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Report AI content
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close report dialog"
                className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
              >
                Close
              </button>
            </div>
            <div className="mt-4">
              <ReportIssueForm
                sermonId={sermonId}
                sermonTitle={sermonTitle}
                defaultIssueType={issueType}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
