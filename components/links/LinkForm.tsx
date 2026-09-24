"use client";

// A form block: collects a few fields and posts them to /api/links/submit,
// which stores them for the admin and optionally emails a notification.
//
// Collapsed behind a button by default so a signup form doesn't push every
// link below the fold. The honeypot is a visually-hidden text field that a
// person never fills and a naive bot always does; the server drops anything
// that arrives with it set.

import { useId, useState } from "react";
import Link from "next/link";
import type { FormFieldKind, LinkBlockOf } from "@/lib/linkPages/types";

const INPUT_TYPE: Record<Exclude<FormFieldKind, "textarea" | "checkbox">, string> = {
  name: "text",
  email: "email",
  phone: "tel",
  text: "text",
};

const AUTOCOMPLETE: Partial<Record<FormFieldKind, string>> = {
  name: "name",
  email: "email",
  phone: "tel",
};

export default function LinkForm({
  block,
  preview,
}: {
  block: LinkBlockOf<"form">;
  preview: boolean;
}) {
  const d = block.data;
  const uid = useId();
  const [expanded, setExpanded] = useState(!d.collapsed);
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (preview || status === "sending") return;
    setError(null);

    const form = new FormData(e.currentTarget);
    const values: Record<string, string | boolean> = {};
    for (const field of d.fields) {
      values[field.id] =
        field.kind === "checkbox" ? form.get(field.id) === "on" : String(form.get(field.id) ?? "");
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/links/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId: block.id,
          values,
          website: String(form.get("website") ?? ""),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setStatus("idle");
        return;
      }
      setStatus("done");
    } catch {
      setError("Couldn't send — check your connection and try again.");
      setStatus("idle");
    }
  }

  if (!expanded) {
    return (
      <button type="button" className="lp-btn" onClick={() => setExpanded(true)} aria-expanded="false">
        <span className="lp-btn-fill" aria-hidden="true" />
        <span className="lp-btn-icon material-symbols-rounded" aria-hidden="true">
          contact_mail
        </span>
        <span className="lp-btn-body">
          <span className="lp-btn-title">{d.title}</span>
          {d.description && <span className="lp-btn-sub">{d.description}</span>}
        </span>
        <span className="lp-btn-arrow material-symbols-rounded" aria-hidden="true">
          expand_more
        </span>
      </button>
    );
  }

  return (
    <section className="lp-form" aria-labelledby={`${uid}-title`}>
      <p id={`${uid}-title`} className="lp-form-title">
        {d.title}
      </p>
      {d.description && <p className="lp-form-desc">{d.description}</p>}

      {status === "done" ? (
        <p className="lp-form-done" role="status" style={{ marginTop: "1rem" }}>
          <span className="material-symbols-rounded" aria-hidden="true" style={{ color: "var(--lp-accent)" }}>
            check_circle
          </span>
          {d.successMessage}
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate={false}>
          <div className="lp-form-fields">
            {d.fields.map((field) => {
              const id = `${uid}-${field.id}`;
              if (field.kind === "checkbox") {
                return (
                  <label key={field.id} htmlFor={id} className="lp-check">
                    <input id={id} name={field.id} type="checkbox" required={field.required} />
                    <span>{field.label}</span>
                  </label>
                );
              }
              return (
                <div key={field.id}>
                  <label htmlFor={id}>
                    {field.label}
                    {!field.required && <span style={{ opacity: 0.6, fontWeight: 500 }}> (optional)</span>}
                  </label>
                  {field.kind === "textarea" ? (
                    <textarea id={id} name={field.id} rows={4} required={field.required} maxLength={2000} className="lp-input" />
                  ) : (
                    <input
                      id={id}
                      name={field.id}
                      type={INPUT_TYPE[field.kind]}
                      autoComplete={AUTOCOMPLETE[field.kind]}
                      required={field.required}
                      maxLength={field.kind === "text" || field.kind === "name" ? 200 : 254}
                      className="lp-input"
                    />
                  )}
                </div>
              );
            })}
            <div className="lp-hp" aria-hidden="true">
              <label htmlFor={`${uid}-website`}>Website</label>
              <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>
          </div>

          {error && (
            <p className="lp-form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="lp-pill" style={{ marginTop: "1rem", width: "100%" }} disabled={status === "sending" || preview}>
            {status === "sending" ? "Sending…" : d.submitLabel || "Send"}
          </button>
          <p className="lp-form-note">
            We&apos;ll only use this to reply to you. See our{" "}
            <Link href="/privacy" onClick={(e) => preview && e.preventDefault()}>
              Privacy Policy
            </Link>
            .
          </p>
        </form>
      )}
    </section>
  );
}
