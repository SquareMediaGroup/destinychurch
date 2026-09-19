"use client";

import { useEffect, useState } from "react";
import {
  formatDate,
  REVIEW_TYPE_LABELS,
  type ChecklistItem,
  type Review,
} from "@/lib/hr";
import { PageHeader, PageLoading, ErrorNote, EmptyState } from "@/components/admin/AdminUI";

// Never carries `summary` — the API deliberately omits a manager's private
// review notes from the portal response (see app/api/portal/reviews/route.ts).
type PortalReview = Pick<Review, "id" | "review_date" | "type" | "reviewer" | "next_review_date">;

export default function PortalReviewsPage() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [reviews, setReviews] = useState<PortalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Reviews & Onboarding | Destiny Church";
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/portal/checklists").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/portal/reviews").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([cl, rv]) => {
        setChecklist(Array.isArray(cl) ? cl : []);
        setReviews(Array.isArray(rv) ? rv : []);
      })
      .catch(() => setError("Could not load your reviews."))
      .finally(() => setLoading(false));
  }, []);

  async function toggle(item: ChecklistItem) {
    setTogglingId(item.id);
    const nextDone = !item.is_done;
    setChecklist((items) => items.map((i) => (i.id === item.id ? { ...i, is_done: nextDone } : i)));
    try {
      const res = await fetch(`/api/portal/checklists/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_done: nextDone }),
      });
      if (!res.ok) {
        // Roll back — the server rejected it (or it's gone).
        setChecklist((items) => items.map((i) => (i.id === item.id ? item : i)));
      }
    } catch {
      setChecklist((items) => items.map((i) => (i.id === item.id ? item : i)));
    } finally {
      setTogglingId(null);
    }
  }

  if (loading) return <PageLoading label="Loading your reviews" />;

  const done = checklist.filter((c) => c.is_done).length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <PageHeader title="Reviews & onboarding" subtitle="Your appraisal history and checklist." />

      <ErrorNote>{error}</ErrorNote>

      {checklist.length > 0 && (
        <section className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black text-destiny-grey">Onboarding checklist</h2>
            <span className="text-xs font-bold text-destiny-grey/40">
              {done} / {checklist.length} done
            </span>
          </div>
          <ul className="divide-y divide-black/5">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3">
                <button
                  type="button"
                  disabled={togglingId === item.id}
                  onClick={() => toggle(item)}
                  aria-pressed={item.is_done}
                  aria-label={item.is_done ? "Mark as not done" : "Mark as done"}
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition disabled:opacity-50 ${
                    item.is_done
                      ? "border-destiny-orange bg-destiny-orange text-white"
                      : "border-black/20 text-transparent hover:border-destiny-orange/50"
                  }`}
                >
                  <span className="material-symbols-rounded text-sm" aria-hidden="true">
                    check
                  </span>
                </button>
                <div>
                  <p
                    className={`text-sm font-bold ${
                      item.is_done ? "text-destiny-grey/40 line-through" : "text-destiny-grey"
                    }`}
                  >
                    {item.label}
                  </p>
                  {item.due_date ? (
                    <p className="text-xs text-destiny-grey/40">Due {formatDate(item.due_date)}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-black text-destiny-grey">Review history</h2>
        {reviews.length === 0 ? (
          <EmptyState
            icon="fact_check"
            title="No reviews logged yet"
            hint="Your appraisals and 1-to-1s will show up here once HR logs one."
          />
        ) : (
          <ul className="divide-y divide-black/5">
            {reviews.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-destiny-grey">
                    {REVIEW_TYPE_LABELS[r.type]} · {formatDate(r.review_date)}
                  </p>
                  {r.reviewer ? (
                    <span className="text-xs text-destiny-grey/50">with {r.reviewer}</span>
                  ) : null}
                </div>
                {r.next_review_date ? (
                  <p className="mt-0.5 text-xs text-destiny-grey/40">
                    Next review: {formatDate(r.next_review_date)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-destiny-grey/40">
          Notes from your reviews are kept with HR — ask your manager if you&apos;d like to go over
          them.
        </p>
      </section>
    </div>
  );
}
