"use client";

import { useEffect, useState, useCallback } from "react";
import {
  API,
  fullName,
  formatDate,
  REVIEW_TYPE_LABELS,
  type Staff,
  type Review,
} from "@/lib/hr";
import { HrHeader, Badge, EmptyState, primaryBtn } from "@/components/admin/hr/HrUI";
import { ReviewModal } from "@/components/admin/hr/modals";
import { useDialog } from "@/components/DialogProvider";

export default function ReviewsPage() {
  const { confirm } = useDialog();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([
      fetch(`${API}/staff`).then((res) => res.json()),
      fetch(`${API}/reviews`).then((res) => res.json()),
    ]);
    setStaff(Array.isArray(s) ? s : []);
    setReviews(Array.isArray(r) ? r : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (
      !(await confirm({
        title: "Delete review",
        message: "Delete this review?",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    const res = await fetch(`${API}/reviews/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not delete review.");
      return;
    }
    load();
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <HrHeader
        title="Reviews & 1-to-1s"
        subtitle="Appraisals, catch-ups and what's coming up."
        back={{ href: "/admin/hr", label: "HR" }}
        action={
          <button className={primaryBtn} onClick={() => setAdding(true)}>
            <span className="material-symbols-rounded text-lg">add</span>
            Log review
          </button>
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-destiny-red/10 px-4 py-2.5 text-sm text-destiny-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-destiny-grey/50">Loading…</p>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="rate_review"
          title="No reviews logged yet"
          hint="Record appraisals and 1-to-1s to keep track of next steps."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => {
            const due = r.next_review_date && r.next_review_date >= today;
            return (
              <li
                key={r.id}
                className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-destiny-grey">
                        {r.hr_staff ? fullName(r.hr_staff) : "Unknown"}
                      </p>
                      <Badge tone="blue">{REVIEW_TYPE_LABELS[r.type]}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-destiny-grey/45">
                      {formatDate(r.review_date)}
                      {r.reviewer ? ` · with ${r.reviewer}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(r.id)}
                    className="text-destiny-grey/40 transition hover:text-destiny-red"
                    aria-label="Delete"
                  >
                    <span className="material-symbols-rounded text-xl">delete</span>
                  </button>
                </div>
                {r.summary && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-destiny-grey/70">
                    {r.summary}
                  </p>
                )}
                {r.next_review_date && (
                  <p className="mt-3 text-xs font-bold text-destiny-grey/50">
                    Next review:{" "}
                    <span className={due ? "text-destiny-orange" : ""}>
                      {formatDate(r.next_review_date)}
                    </span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <ReviewModal
          staffList={staff}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setError("");
            load();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}
