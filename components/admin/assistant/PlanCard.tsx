"use client";

// The plan DestinyAI proposed, as one card: every step, the switches for its
// follow-ups, and one Confirm. Steps that remove or replace something live
// (risk "destructive", decided by the server) need a second, explicit
// confirmation in a dialog before anything runs.

import { useEffect, useState } from "react";
import { Badge, Modal, Toggle, dangerBtn, ghostBtn, primaryBtn } from "@/components/admin/AdminUI";
import type { Plan, PlanAction } from "@/lib/adminAgent/types";

const STATUS: Record<PlanAction["status"], { icon: string; label: string; tone: string }> = {
  pending: { icon: "radio_button_unchecked", label: "Waiting", tone: "text-destiny-grey/35 dark:text-white/35" },
  executed: { icon: "check_circle", label: "Done", tone: "text-success" },
  failed: { icon: "error", label: "Failed", tone: "text-danger" },
  skipped: { icon: "remove_circle_outline", label: "Not run", tone: "text-destiny-grey/35 dark:text-white/35" },
  undone: { icon: "undo", label: "Undone", tone: "text-destiny-grey/50 dark:text-white/50" },
};

const PLAN_BADGE: Record<Plan["status"], { tone: string; label: string }> = {
  pending: { tone: "orange", label: "Ready to confirm" },
  executed: { tone: "green", label: "Done" },
  partial: { tone: "orange", label: "Partly done" },
  failed: { tone: "red", label: "Failed" },
  cancelled: { tone: "grey", label: "Cancelled" },
};

export default function PlanCard({
  plan,
  onPlan,
  onEdit,
}: {
  plan: Plan;
  onPlan: (plan: Plan) => void;
  /** "Change something": cancel this and let the admin say what to change. */
  onEdit: () => void;
}) {
  const [include, setInclude] = useState<Record<string, boolean>>({});
  const [followUps, setFollowUps] = useState<Record<string, number[]>>(() =>
    Object.fromEntries(
      plan.actions.map((a) => [
        a.id,
        a.follow_ups.map((f, i) => (f.on_by_default ? i : -1)).filter((i) => i >= 0),
      ]),
    ),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const pending = plan.status === "pending";
  // Flips when the plan passes its expiry, so an open card stops offering
  // Confirm at the moment the server would refuse it.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setTimedOut(true), Math.max(0, Date.parse(plan.expires_at) - Date.now()));
    return () => clearTimeout(timer);
  }, [pending, plan.expires_at]);
  const expired = pending && timedOut;
  const included = plan.actions.filter((a) => include[a.id] !== false);
  const destructive = included.filter((a) => a.risk === "destructive");

  async function decide(decision: "confirm" | "cancel", acknowledged: string[] = []) {
    setBusy(decision);
    setError("");
    try {
      const res = await fetch(`/api/admin/assistant/plans/${plan.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, include, follow_ups: followUps, acknowledged }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.plan) onPlan(data.plan as Plan);
      if (res.status === 409 && data.needs_acknowledgement) {
        // Something became destructive since it was proposed: ask again.
        setReviewing(true);
        return;
      }
      if (!res.ok) setError(data.error ?? "That didn't work.");
      setReviewing(false);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  async function undo(action: PlanAction) {
    setBusy(action.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/assistant/actions/${action.id}/undo`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (data.plan) onPlan(data.plan as Plan);
      if (!res.ok) setError(data.error ?? "Couldn't undo that.");
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  function toggleFollowUp(actionId: string, index: number, on: boolean) {
    setFollowUps((current) => {
      const list = new Set(current[actionId] ?? []);
      if (on) list.add(index);
      else list.delete(index);
      return { ...current, [actionId]: [...list] };
    });
  }

  function onConfirm() {
    if (destructive.length > 0) setReviewing(true);
    else void decide("confirm");
  }

  const badge = expired ? { tone: "grey", label: "Expired" } : PLAN_BADGE[plan.status];

  return (
    <div className="rounded-2xl border border-black/8 bg-white shadow-sm dark:border-white/10 dark:bg-destiny-grey-800">
      <div className="flex items-center justify-between gap-3 border-b border-black/5 px-4 py-3 dark:border-white/8">
        <p className="text-sm font-black text-destiny-grey dark:text-white">
          {plan.actions.length === 1 ? "1 step" : `${plan.actions.length} steps`}
        </p>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>

      <ol className="divide-y divide-black/5 dark:divide-white/8">
        {plan.actions.map((action, index) => {
          const status = STATUS[action.status];
          const left = include[action.id] === false;
          return (
            <li key={action.id} className={`px-4 py-3 ${left ? "opacity-50" : ""}`}>
              <div className="flex items-start gap-3">
                {pending ? (
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/5 text-[11px] font-black text-destiny-grey/60 dark:bg-white/10 dark:text-white/60">
                    {index + 1}
                  </span>
                ) : (
                  <span
                    className={`material-symbols-rounded mt-0.5 text-xl ${status.tone}`}
                    aria-label={status.label}
                    role="img"
                  >
                    {status.icon}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-destiny-grey dark:text-white">{action.label}</p>
                  {action.detail && (
                    <p className="mt-0.5 text-xs leading-relaxed text-destiny-grey/55 dark:text-white/55">
                      {action.detail}
                    </p>
                  )}
                  {action.risk === "destructive" && pending && (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-danger">
                      <span className="material-symbols-rounded text-sm" aria-hidden="true">warning</span>
                      Needs a second confirm
                    </p>
                  )}
                  {action.warnings.map((w) => (
                    <p key={w} className="mt-1 text-xs leading-relaxed text-danger">
                      {w}
                    </p>
                  ))}
                  {action.error && <p className="mt-1 text-xs font-medium text-danger">{action.error}</p>}

                  {pending &&
                    !left &&
                    action.follow_ups.map((f, i) => (
                      <label
                        key={f.label}
                        className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-destiny-orange/[0.06] px-3 py-2 text-xs font-medium text-destiny-grey dark:text-white"
                      >
                        <span>{f.label}</span>
                        <Toggle
                          label={f.label}
                          checked={(followUps[action.id] ?? []).includes(i)}
                          onChange={(on) => toggleFollowUp(action.id, i, on)}
                        />
                      </label>
                    ))}

                </div>

                {pending && plan.actions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setInclude((c) => ({ ...c, [action.id]: left }))}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-destiny-grey/50 transition hover:bg-black/5 hover:text-destiny-grey dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
                  >
                    {left ? "Include" : "Leave out"}
                  </button>
                )}
                {action.undoable && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => undo(action)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-destiny-orange transition hover:bg-destiny-orange/10 disabled:opacity-50"
                  >
                    {busy === action.id ? "Undoing…" : "Undo"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {error && (
        <p role="alert" className="mx-4 mb-3 rounded-xl bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}

      {pending && !expired && (
        <div className="flex flex-wrap items-center gap-2 border-t border-black/5 px-4 py-3 dark:border-white/8">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy !== null || included.length === 0}
            className={`${destructive.length ? dangerBtn : primaryBtn} w-full sm:w-auto`}
          >
            {busy === "confirm" ? "Working…" : destructive.length ? "Review and confirm" : "Confirm"}
          </button>
          <button type="button" onClick={onEdit} disabled={busy !== null} className={`${ghostBtn} flex-1 sm:flex-none`}>
            Change something
          </button>
          <button
            type="button"
            onClick={() => decide("cancel")}
            disabled={busy !== null}
            className="px-2 py-2 text-sm font-bold text-destiny-grey/50 transition hover:text-destiny-grey dark:text-white/50 dark:hover:text-white"
          >
            {busy === "cancel" ? "Cancelling…" : "Cancel"}
          </button>
        </div>
      )}
      {expired && (
        <p className="border-t border-black/5 px-4 py-3 text-xs text-destiny-grey/55 dark:border-white/8 dark:text-white/55">
          Plans expire after 30 minutes so they never run on an out-of-date picture of the site. Ask again to get a fresh one.
        </p>
      )}

      {reviewing && (
        <Modal title="Confirm these changes" onClose={() => setReviewing(false)}>
          <p className="text-sm text-destiny-grey/70 dark:text-white/70">
            {destructive.length === 1
              ? "This step removes or replaces something that is on the site now."
              : "These steps remove or replace something that is on the site now."}
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {destructive.map((a) => (
              <li key={a.id} className="rounded-xl border border-danger/20 bg-danger/[0.05] px-3 py-2.5">
                <p className="text-sm font-bold text-destiny-grey dark:text-white">{a.label}</p>
                {a.detail && <p className="mt-0.5 text-xs text-destiny-grey/60 dark:text-white/60">{a.detail}</p>}
                {a.warnings.map((w) => (
                  <p key={w} className="mt-1 text-xs text-danger">
                    {w}
                  </p>
                ))}
                {(followUps[a.id] ?? []).map((i) =>
                  a.follow_ups[i] ? (
                    <p key={i} className="mt-1 text-xs font-medium text-destiny-grey/70 dark:text-white/70">
                      Plus: {a.follow_ups[i].label}
                    </p>
                  ) : null,
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setReviewing(false)} className={ghostBtn}>
              Go back
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => decide("confirm", destructive.map((a) => a.id))}
              className={dangerBtn}
            >
              {busy === "confirm" ? "Working…" : "Yes, go ahead"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
