"use client";

import { useState } from "react";
import { API } from "@/lib/posts";

interface Problem {
  href: string;
  where: string;
  problem: string;
}

type CheckState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "done"; checked: number; problems: Problem[]; truncated: boolean }
  | { status: "error"; message: string };

/**
 * "Check links": asks the server to try every link in the body (internal ones
 * against the site's own pages, external ones over the network) and lists the
 * ones that look broken. On demand rather than live, because checking other
 * sites takes a few seconds.
 */
export function LinkCheck({ body }: { body: string }) {
  const [state, setState] = useState<CheckState>({ status: "idle" });

  async function run() {
    setState({ status: "checking" });
    try {
      const res = await fetch(`${API}/check-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.problems)) {
        setState({ status: "error", message: data.error || "Couldn't check the links." });
        return;
      }
      setState({ status: "done", checked: data.checked, problems: data.problems, truncated: data.truncated });
    } catch {
      setState({ status: "error", message: "Couldn't check the links." });
    }
  }

  return (
    <div className="rounded-xl border border-black/8 px-3 py-2.5 dark:border-white/8">
      <div className="flex items-center gap-2">
        <span className="material-symbols-rounded text-[17px] text-destiny-grey/45 dark:text-white/45" aria-hidden="true">
          link
        </span>
        <p className="flex-1 text-xs font-bold text-destiny-grey/70 dark:text-white/70">Links on this page</p>
        <button
          type="button"
          onClick={run}
          disabled={state.status === "checking"}
          className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa] disabled:opacity-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
        >
          {state.status === "checking" ? "Checking…" : state.status === "done" ? "Check again" : "Check links"}
        </button>
      </div>
      {state.status === "error" && <p className="mt-2 text-xs font-medium text-destiny-red">{state.message}</p>}
      {state.status === "done" &&
        (state.checked === 0 ? (
          <p className="mt-2 text-xs text-destiny-grey/55 dark:text-white/55">There are no links on this page.</p>
        ) : state.problems.length === 0 ? (
          <p className="mt-2 text-xs font-medium text-destiny-green">
            All {state.checked} {state.checked === 1 ? "link works" : "links work"}.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {state.problems.map((p, i) => (
              <li key={`${p.href}-${i}`} className="text-xs">
                <p className="truncate font-mono text-[11px] text-destiny-grey/70 dark:text-white/70" title={p.href}>
                  {p.href}
                </p>
                <p className="text-destiny-red">{p.problem}</p>
                {p.where && <p className="truncate text-[11px] text-destiny-grey/45 dark:text-white/45">In: {p.where}</p>}
              </li>
            ))}
          </ul>
        ))}
      {state.status === "done" && state.truncated && (
        <p className="mt-2 text-[11px] text-destiny-grey/45 dark:text-white/45">Only the first 25 links were checked.</p>
      )}
    </div>
  );
}
