"use client";

import { useState } from "react";
import { submitApplication } from "./actions";

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/35 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15";
const labelClass =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-destiny-grey/45";

export default function ApplyForm({
  jobId,
  jobTitle,
}: {
  jobId: string;
  jobTitle: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("job_id", jobId);
    fd.set("job_title", jobTitle);
    const res = await submitApplication(fd);
    if (res.success) {
      setStatus("done");
    } else {
      setStatus("error");
      setError(res.error || "Something went wrong.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-3xl border border-destiny-green/20 bg-destiny-green/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destiny-green/15">
          <span className="material-symbols-rounded text-3xl text-destiny-green">
            check
          </span>
        </div>
        <h3 className="text-xl font-black text-destiny-grey">Application received</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-destiny-grey/60">
          Thank you for applying for {jobTitle}. Our team will be in touch if your
          experience is a good fit for the role.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="first_name">
            First name *
          </label>
          <input id="first_name" name="first_name" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="last_name">
            Last name *
          </label>
          <input id="last_name" name="last_name" required className={inputClass} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="email">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">
            Phone
          </label>
          <input id="phone" name="phone" type="tel" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="cover_letter">
          Why are you a good fit?
        </label>
        <textarea
          id="cover_letter"
          name="cover_letter"
          rows={5}
          className={inputClass}
          placeholder="Tell us a little about yourself and why this role excites you."
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="cv">
          CV / Résumé
        </label>
        <input
          id="cv"
          name="cv"
          type="file"
          accept=".pdf,.doc,.docx"
          className="block w-full text-sm text-destiny-grey/70 file:mr-3 file:rounded-lg file:border-0 file:bg-destiny-orange/10 file:px-4 file:py-2.5 file:text-sm file:font-bold file:text-destiny-orange"
        />
        <p className="mt-1.5 text-xs text-destiny-grey/40">
          PDF or Word, up to 10MB.
        </p>
      </div>

      {status === "error" && (
        <p className="rounded-xl bg-destiny-red/10 px-4 py-2.5 text-sm text-destiny-red">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110 disabled:opacity-60"
      >
        {status === "saving" ? "Sending…" : "Submit application"}
      </button>
    </form>
  );
}
