"use client";

import { useEffect, useState, useCallback } from "react";
import {
  API,
  fullName,
  formatDate,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  type Staff,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/hr";
import { HrHeader, Badge, EmptyState, primaryBtn } from "@/components/admin/hr/HrUI";
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

  const pending = leave.filter((l) => l.status === "pending");
  const balances = staff
    .filter((s) => s.status !== "left")
    .map((s) => {
      const used = leave
        .filter(
          (l) => l.staff_id === s.id && l.status === "approved" && l.type === "holiday",
        )
        .reduce((sum, l) => sum + Number(l.days || 0), 0);
      return { staff: s, used, remaining: Number(s.annual_leave_entitlement) - used };
    });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <HrHeader
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

      {error && (
        <p className="mb-4 rounded-xl bg-destiny-red/10 px-4 py-2.5 text-sm text-destiny-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-destiny-grey/50">Loading…</p>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Approvals queue */}
          {pending.length > 0 && (
            <section className="rounded-3xl border border-destiny-orange/30 bg-white shadow-sm">
              <div className="border-b border-black/5 px-5 py-4">
                <h2 className="font-black text-destiny-grey">
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
                      <p className="text-sm font-bold text-destiny-grey">
                        {l.hr_staff ? fullName(l.hr_staff) : "Unknown"}
                        <span className="ml-2 text-xs font-normal text-destiny-grey/45">
                          {LEAVE_TYPE_LABELS[l.type]} · {Number(l.days)} day(s)
                        </span>
                      </p>
                      <p className="text-xs text-destiny-grey/45">
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
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/45">
                Holiday balances
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {balances.map((b) => (
                  <div
                    key={b.staff.id}
                    className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
                  >
                    <p className="text-sm font-bold text-destiny-grey">
                      {fullName(b.staff)}
                    </p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-destiny-orange">
                        {b.remaining}
                      </span>
                      <span className="text-xs text-destiny-grey/45">
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
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/45">
              All requests
            </h2>
            {leave.length === 0 ? (
              <EmptyState icon="event_busy" title="No leave requests yet" />
            ) : (
              <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
                    <tr>
                      <th className="px-5 py-3.5">Staff</th>
                      <th className="hidden px-5 py-3.5 sm:table-cell">Type</th>
                      <th className="px-5 py-3.5">Dates</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {leave.map((l) => (
                      <tr key={l.id} className="transition hover:bg-[#f5f7fa]">
                        <td className="px-5 py-3.5 font-bold text-destiny-grey">
                          {l.hr_staff ? fullName(l.hr_staff) : "Unknown"}
                        </td>
                        <td className="hidden px-5 py-3.5 text-destiny-grey/70 sm:table-cell">
                          {LEAVE_TYPE_LABELS[l.type]}
                        </td>
                        <td className="px-5 py-3.5 text-destiny-grey/70">
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
