"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PORTAL_API,
  formatDate,
  dayCount,
  LEAVE_TYPE_LABELS,
  LEAVE_STATUS_LABELS,
  type LeaveRequest,
  type LeaveStatus,
  type LeaveType,
} from "@/lib/hr";
import {
  PageHeader,
  Badge,
  EmptyState,
  ErrorNote,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
} from "@/components/admin/AdminUI";
import { useDialog } from "@/components/DialogProvider";

const LEAVE_TONE: Record<LeaveStatus, string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
};

export default function PortalLeavePage() {
  const { confirm } = useDialog();
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`${PORTAL_API}/leave`);
    setLeave(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function withdraw(id: string) {
    if (
      !(await confirm({
        title: "Withdraw request",
        message: "Withdraw this leave request?",
        confirmLabel: "Withdraw",
        tone: "danger",
      }))
    )
      return;
    const res = await fetch(`${PORTAL_API}/leave/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not withdraw.");
      return;
    }
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <PageHeader
        title="Leave"
        subtitle="Request time off and see your history."
        action={
          !showForm && (
            <button className={primaryBtn} onClick={() => setShowForm(true)}>
              <span className="material-symbols-rounded text-lg">add</span>
              Request leave
            </button>
          )
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {showForm && (
        <RequestForm
          onCancel={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            setError("");
            load();
          }}
          onError={setError}
        />
      )}

      {loading ? null : leave.length === 0 ? (
        <EmptyState icon="event_busy" title="No leave requests yet" />
      ) : (
        <ul className="flex flex-col gap-3">
          {leave.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="text-sm font-bold text-destiny-grey">
                  {LEAVE_TYPE_LABELS[l.type]} · {Number(l.days)} day(s)
                </p>
                <p className="text-xs text-destiny-grey/45">
                  {formatDate(l.start_date)} – {formatDate(l.end_date)}
                  {l.reason ? ` · ${l.reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={LEAVE_TONE[l.status]}>{LEAVE_STATUS_LABELS[l.status]}</Badge>
                {l.status === "pending" && (
                  <button
                    onClick={() => withdraw(l.id)}
                    className="text-xs font-bold text-destiny-red/70 transition hover:text-destiny-red"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RequestForm({
  onCancel,
  onSaved,
  onError,
}: {
  onCancel: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
}) {
  const [type, setType] = useState<LeaveType>("holiday");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const days = startDate && endDate ? dayCount(startDate, endDate) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${PORTAL_API}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, start_date: startDate, end_date: endDate, reason }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const d = await res.json().catch(() => ({}));
        onError(d.error || "Could not submit your request.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex flex-col gap-4 rounded-3xl border border-black/5 bg-white p-6 shadow-sm"
    >
      <div>
        <label className={labelClass}>Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as LeaveType)}
          className={inputClass}
        >
          {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((t) => (
            <option key={t} value={t}>
              {LEAVE_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Start date</label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>End date</label>
          <input
            type="date"
            required
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      {days > 0 && (
        <p className="text-xs font-bold text-destiny-grey/45">
          {days} day{days === 1 ? "" : "s"}
        </p>
      )}
      <div>
        <label className={labelClass}>Reason (optional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={ghostBtn}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className={primaryBtn}>
          {saving ? "Submitting…" : "Submit request"}
        </button>
      </div>
    </form>
  );
}
