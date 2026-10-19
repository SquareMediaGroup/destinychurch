"use client";

import { useState } from "react";

type State = "closed" | "open" | "sending" | "sent" | "error";

/**
 * One component on the page, with a "Report a problem" form that emails the
 * super admins (POST /api/report). The status label is rendered on the server
 * and passed in as children.
 */
export function ComponentRow({
  id,
  name,
  summary,
  levelLabel,
  children,
}: {
  id: string;
  name: string;
  summary: string;
  levelLabel: string;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>("closed");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot, hidden from people

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ component: id, shownAs: levelLabel, message, email, website }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  const formId = `report-${id}`;

  return (
    <li className="row-wrap">
      <div className="row">
        <div>
          <p className="row-name">{name}</p>
          <p className="muted small">{summary}</p>
        </div>
        <div className="row-side">
          {children}
          {state === "closed" && (
            <button
              type="button"
              className="report-btn"
              aria-expanded={false}
              aria-controls={formId}
              onClick={() => setState("open")}
            >
              Report a problem
            </button>
          )}
        </div>
      </div>

      {state === "sent" && (
        <p className="report-done small" role="status">
          Thanks. We&apos;ve let the team know about {name}.
        </p>
      )}

      {(state === "open" || state === "sending" || state === "error") && (
        <form id={formId} className="report-form" onSubmit={submit}>
          <label className="small" htmlFor={`${formId}-msg`}>
            What isn&apos;t working with {name}?
          </label>
          <textarea
            id={`${formId}-msg`}
            rows={3}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="For example: messages won't send on iPhone"
          />
          <label className="small" htmlFor={`${formId}-email`}>
            Your email (optional, if you'd like a reply)
          </label>
          <input
            id={`${formId}-email`}
            type="email"
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="hp"
            tabIndex={-1}
            aria-hidden
            autoComplete="off"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          {state === "error" && (
            <p className="report-error small" role="alert">
              Couldn&apos;t send that. Please try again, or email admin@destinytees.uk.
            </p>
          )}
          <div className="report-actions">
            <button type="submit" className="report-send" disabled={state === "sending"}>
              {state === "sending" ? "Sending..." : "Send report"}
            </button>
            <button type="button" className="report-cancel" onClick={() => setState("closed")}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </li>
  );
}
