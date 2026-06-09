"use client";

import { useEffect, useRef, useState } from "react";
import { submitBugReport } from "./actions";

export default function ReportBugLink() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  // Close on Escape and lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function openModal() {
    setStatus("idle");
    setErrorMsg("");
    setFileName("");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    formData.set("pageUrl", typeof window !== "undefined" ? window.location.href : "");

    const result = await submitBugReport(formData);

    if (result.success) {
      setStatus("success");
      formRef.current?.reset();
      setFileName("");
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Something went wrong.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="text-left text-white/50 underline underline-offset-2 transition hover:text-white"
      >
        Report a Bug
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-bug-title"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden="true"
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 text-left shadow-2xl sm:p-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="report-bug-title" className="text-xl font-bold text-destiny-grey">
                  Report a Bug
                </h2>
                <p className="mt-1 text-sm text-destiny-grey/60">
                  Found something broken? Let us know and attach a screenshot if you can.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="shrink-0 rounded-full p-1 text-destiny-grey/50 transition hover:bg-black/5 hover:text-destiny-grey"
              >
                <span className="material-symbols-rounded block text-2xl">close</span>
              </button>
            </div>

            {status === "success" ? (
              <div className="rounded-2xl bg-green-50 px-4 py-6 text-center">
                <span className="material-symbols-rounded mb-1 block text-3xl text-green-600">
                  check_circle
                </span>
                <p className="font-bold text-green-700">Bug report sent!</p>
                <p className="text-sm text-green-600">
                  Thanks for helping us out — our tech team will take a look.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-4 rounded-full bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Close
                </button>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-bold text-destiny-grey" htmlFor="bug-name">
                    Full Name
                  </label>
                  <input
                    id="bug-name"
                    name="name"
                    type="text"
                    required
                    placeholder="Your name"
                    className="w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-destiny-grey" htmlFor="bug-email">
                    Email Address
                  </label>
                  <input
                    id="bug-email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-destiny-grey" htmlFor="bug-steps">
                    How to reproduce
                  </label>
                  <textarea
                    id="bug-steps"
                    name="steps"
                    required
                    rows={5}
                    placeholder="What were you doing when it happened? What did you expect, and what went wrong?"
                    className="w-full resize-none rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-bold text-destiny-grey" htmlFor="bug-screenshot">
                    Screenshot <span className="font-normal text-destiny-grey/50">(optional)</span>
                  </label>
                  <label
                    htmlFor="bug-screenshot"
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-black/15 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey/70 transition hover:border-destiny-orange hover:text-destiny-grey"
                  >
                    <span className="material-symbols-rounded text-xl text-destiny-grey/50">image</span>
                    <span className="truncate">{fileName || "Choose an image…"}</span>
                  </label>
                  <input
                    id="bug-screenshot"
                    name="screenshot"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                  />
                  <p className="mt-1.5 text-xs text-destiny-grey/45">
                    Your screenshot is emailed to our team and never stored on our server.
                  </p>
                </div>

                {status === "error" && (
                  <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-full bg-destiny-orange py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60"
                >
                  {status === "loading" ? "Sending…" : "Send Bug Report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
