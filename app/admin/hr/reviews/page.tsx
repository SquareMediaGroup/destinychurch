"use client";

import { useEffect, useState, useCallback } from "react";
import {
  API,
  fullName,
  formatDate,
  REVIEW_TYPE_LABELS,
  type Staff,
  type Review,
  type ReviewType,
} from "@/lib/hr";
import {
  PageHeader,
  Badge,
  EmptyState,
  ErrorNote,
  ListToolbar,
  FilterChips,
  CardSkeleton,
  primaryBtn,
} from "@/components/admin/AdminUI";
import { useAdminList } from "@/lib/useAdminList";
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

  const today = new Date().toISOString().slice(0, 10);

  const list = useAdminList<Review>({
    items: reviews,
    searchKeys: [
      { name: "hr_staff.first_name", weight: 0.3 },
      { name: "hr_staff.last_name", weight: 0.3 },
      { name: "reviewer", weight: 0.2 },
      { name: "summary", weight: 0.2 },
    ],
    filters: [
      {
        key: "type",
        options: (Object.keys(REVIEW_TYPE_LABELS) as ReviewType[]).map((t) => ({
          value: t,
          label: REVIEW_TYPE_LABELS[t],
        })),
        match: (r, value) => r.type === value,
      },
      {
        key: "due",
        options: [{ value: "upcoming", label: "Next review due" }],
        match: (r) => Boolean(r.next_review_date && r.next_review_date >= today),
      },
    ],
    sorts: { reviewed: (a, b) => a.review_date.localeCompare(b.review_date) },
    defaultSort: { field: "reviewed", direction: "desc" },
  });

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

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
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

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <CardSkeleton count={3} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="rate_review"
          title="No reviews logged yet"
          hint="Record appraisals and 1-to-1s to keep track of next steps."
          action={
            <button className={primaryBtn} onClick={() => setAdding(true)}>
              <span className="material-symbols-rounded text-lg">add</span>
              Log review
            </button>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search person, reviewer or notes"
            noun="review"
            total={list.total}
            shown={list.shown}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <FilterChips
                  label="Type"
                  options={list.filterOptions("type")}
                  value={list.filterValues.type}
                  onChange={(v) => list.setFilter("type", v)}
                />
                <FilterChips
                  label="Due"
                  options={list.filterOptions("due").filter((o) => o.value !== "all")}
                  value={list.filterValues.due}
                  onChange={(v) =>
                    list.setFilter("due", list.filterValues.due === v ? "all" : v)
                  }
                />
              </div>
            }
          />

          {list.visible.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No reviews match"
              hint="Try a person's name, the reviewer, or a word from the notes."
              action={
                <button
                  className="text-sm font-bold text-destiny-orange hover:brightness-110"
                  onClick={list.clearAll}
                >
                  Clear search and filters
                </button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {list.visible.map((r) => {
                const due = r.next_review_date && r.next_review_date >= today;
                return (
                  <li
                    key={r.id}
                    className="rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-5 shadow-sm"
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
                        aria-label="Delete review"
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
        </>
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
