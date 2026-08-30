"use client";

import { useEffect, useState, useCallback } from "react";
import {
  API,
  fullName,
  formatDate,
  leaveRemaining,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  type Staff,
  type LeaveRequest,
  type LeaveStatus,
  type LeaveType,
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
import { LeaveModal } from "@/components/admin/hr/modals";

const STATUS_TONE: Record<LeaveStatus, string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
};

export default function LeavePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([
      fetch(`${API}/staff`).then((r) => r.json()),
      fetch(`${API}/leave`).then((r) => r.json()),
    ]);
    setStaff(Array.isArray(s) ? s : []);
    setLeave(Array.isArray(l) ? l : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, status: "approved" | "rejected") {
    const res = await fetch(`${API}/leave/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not update request.");
      return;
    }
    load();
  }

  const list = useAdminList<LeaveRequest>({
    items: leave,
    searchKeys: [
      { name: "hr_staff.first_name", weight: 0.35 },
      { name: "hr_staff.last_name", weight: 0.35 },
      { name: "reason", weight: 0.3 },
    ],
    filters: [
      {
        key: "status",
        options: (Object.keys(LEAVE_STATUS_LABELS) as LeaveStatus[]).map((s) => ({
          value: s,
          label: LEAVE_STATUS_LABELS[s],
        })),
        match: (l, value) => l.status === value,
      },
      {
        key: "type",
        options: (Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((t) => ({
          value: t,
          label: LEAVE_TYPE_LABELS[t],
        })),
        match: (l, value) => l.type === value,
      },
    ],
    sorts: { start: (a, b) => a.start_date.localeCompare(b.start_date) },
    defaultSort: { field: "start", direction: "desc" },
  });

  const pending = leave.filter((l) => l.status === "pending");
  const balances = staff
    .filter((s) => s.status !== "left")
    .map((s) => ({
      staff: s,
      remaining: leaveRemaining(s, leave.filter((l) => l.staff_id === s.id)),
    }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title="Leave & time-off"
        subtitle="Approve requests and track holiday balances."
        back={{ href: "/admin/hr", label: "HR" }}
        action={
          <button className={primaryBtn} onClick={() => setAdding(true)}>
            <span className="material-symbols-rounded text-lg">add</span>
            Request leave
          </button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Approvals queue */}
          {pending.length > 0 && (
            <section className="rounded-3xl border border-destiny-orange/30 bg-white shadow-sm dark:bg-destiny-grey-800">
              <div className="border-b border-black/5 px-5 py-4">
                <h2 className="font-black text-destiny-grey dark:text-white">
                  Awaiting approval ({pending.length})
                </h2>
              </div>
              <ul className="divide-y divide-black/5">
                {pending.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div>
                      <p className="text-sm font-bold text-destiny-grey dark:text-white">
                        {l.hr_staff ? fullName(l.hr_staff) : "Unknown"}
                        <span className="ml-2 text-xs font-normal text-destiny-grey/45 dark:text-white/45">
                          {LEAVE_TYPE_LABELS[l.type]} · {Number(l.days)} day(s)
                        </span>
                      </p>
                      <p className="text-xs text-destiny-grey/45 dark:text-white/45">
                        {formatDate(l.start_date)} – {formatDate(l.end_date)}
                        {l.reason ? ` · ${l.reason}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(l.id, "approved")}
                        className="rounded-lg bg-destiny-green/10 px-3 py-1.5 text-xs font-bold text-destiny-green transition hover:bg-destiny-green/20"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => decide(l.id, "rejected")}
                        className="rounded-lg bg-destiny-red/10 px-3 py-1.5 text-xs font-bold text-destiny-red transition hover:bg-destiny-red/20"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Balances */}
          {balances.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
                Holiday balances
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {balances.map((b) => (
                  <div
                    key={b.staff.id}
                    className="rounded-2xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-4 shadow-sm"
                  >
                    <p className="text-sm font-bold text-destiny-grey dark:text-white">
                      {fullName(b.staff)}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-destiny-orange">
                        {b.remaining}
                      </span>
                      <span className="text-xs text-destiny-grey/45 dark:text-white/45">
                        / {b.staff.annual_leave_entitlement} days left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* All requests */}
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
              All requests
            </h2>
            {leave.length === 0 ? (
              <EmptyState icon="event_busy" title="No leave requests yet" />
            ) : (
              <>
              <ListToolbar
                search={list.search}
                onSearchChange={list.setSearch}
                searchPlaceholder="Search person or reason"
                noun="request"
                total={list.total}
                shown={list.shown}
                filters={
                  <div className="flex flex-wrap items-center gap-2">
                    <FilterChips
                      label="Status"
                      options={list.filterOptions("status")}
                      value={list.filterValues.status}
                      onChange={(v) => list.setFilter("status", v)}
                    />
                    <FilterChips
                      label="Type"
                      options={list.filterOptions("type").filter((o) => o.value !== "all")}
                      value={list.filterValues.type}
                      onChange={(v) =>
                        list.setFilter("type", list.filterValues.type === v ? "all" : v)
                      }
                    />
                  </div>
                }
              />

              {list.visible.length === 0 ? (
                <EmptyState
                  icon="search_off"
                  title="No requests match"
                  hint="Try a person's name, or clear the filters."
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
              <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                    <tr>
                      <th className="px-5 py-3.5">Staff</th>
                      <th className="hidden px-5 py-3.5 sm:table-cell">Type</th>
                      <th className="px-5 py-3.5">Dates</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {list.visible.map((l) => (
                      <tr key={l.id} className="transition hover:bg-[#f5f7fa] dark:hover:bg-white/10">
                        <td className="px-5 py-3.5 font-bold text-destiny-grey dark:text-white">
                          {l.hr_staff ? fullName(l.hr_staff) : "Unknown"}
                        </td>
                        <td className="hidden px-5 py-3.5 text-destiny-grey/70 dark:text-white/70 sm:table-cell">
                          {LEAVE_TYPE_LABELS[l.type]}
                        </td>
                        <td className="px-5 py-3.5 text-destiny-grey/70 dark:text-white/70">
                          {formatDate(l.start_date)} – {formatDate(l.end_date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={STATUS_TONE[l.status]}>
                            {LEAVE_STATUS_LABELS[l.status]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
              </>
            )}
          </section>
        </div>
      )}

      {adding && (
        <LeaveModal
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
