"use client";

import { useEffect, useState } from "react";
import {
  PORTAL_API,
  fullName,
  formatDate,
  leaveRemaining,
  EMPLOYMENT_LABELS,
  LEAVE_STATUS_LABELS,
  type Staff,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/hr";
import { PageHeader, Badge, PageLoading, ErrorNote } from "@/components/admin/AdminUI";

const LEAVE_TONE: Record<LeaveStatus, string> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
};

export default function PortalProfilePage() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${PORTAL_API}/me`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
      fetch(`${PORTAL_API}/leave`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([s, l]) => {
        setStaff(s);
        setLeave(Array.isArray(l) ? l : []);
      })
      .catch(() => setError("Could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading label="Loading your profile" />;

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <PageHeader
        title={staff ? fullName(staff) : "My profile"}
        subtitle={staff?.job_title || undefined}
      />

      <ErrorNote>{error}</ErrorNote>

      {staff && (
        <>
          <section className="mb-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Department" value={staff.department || "—"} />
              <Field label="Employment" value={EMPLOYMENT_LABELS[staff.employment_type]} />
              <Field label="Start date" value={formatDate(staff.start_date)} />
              <Field label="Email" value={staff.email || "—"} />
              <Field label="Phone" value={staff.phone || "—"} />
              <Field
                label="Holiday remaining"
                value={`${leaveRemaining(staff, leave)} / ${staff.annual_leave_entitlement} days`}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-black text-destiny-grey">Recent leave</h2>
            {leave.length === 0 ? (
              <p className="text-sm text-destiny-grey/40">No leave requests yet.</p>
            ) : (
              <ul className="divide-y divide-black/5">
                {leave.slice(0, 5).map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2.5">
                    <p className="text-xs text-destiny-grey/45">
                      {formatDate(l.start_date)} – {formatDate(l.end_date)}
                    </p>
                    <Badge tone={LEAVE_TONE[l.status]}>{LEAVE_STATUS_LABELS[l.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">{label}</p>
      <p className="mt-0.5 text-sm text-destiny-grey">{value}</p>
    </div>
  );
}
