"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  API,
  fullName,
  EMPLOYMENT_LABELS,
  STATUS_LABELS,
  type Staff,
  type StaffStatus,
} from "@/lib/hr";
import { HrHeader, Badge, EmptyState, primaryBtn } from "@/components/admin/hr/HrUI";
import { StaffModal } from "@/components/admin/hr/modals";

const STATUS_TONE: Record<StaffStatus, string> = {
  active: "green",
  on_leave: "orange",
  left: "grey",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Staff | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/staff`);
      const data = await res.json();
      setStaff(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <HrHeader
        title="Staff directory"
        subtitle="Everyone on the team and their key details."
        back={{ href: "/admin/hr", label: "HR" }}
        action={
          <button className={primaryBtn} onClick={() => setEditing("new")}>
            <span className="material-symbols-rounded text-lg">add</span>
            Add staff
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
      ) : staff.length === 0 ? (
        <EmptyState
          icon="badge"
          title="No staff yet"
          hint="Add your first team member to get started."
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
              <tr>
                <th className="px-5 py-3.5">Name</th>
                <th className="hidden px-5 py-3.5 sm:table-cell">Role</th>
                <th className="hidden px-5 py-3.5 md:table-cell">Type</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {staff.map((s) => (
                <tr key={s.id} className="transition hover:bg-[#f5f7fa]">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/hr/staff/${s.id}`}
                      className="font-bold text-destiny-grey hover:text-destiny-orange"
                    >
                      {fullName(s)}
                    </Link>
                    {s.email && <p className="text-xs text-destiny-grey/45">{s.email}</p>}
                  </td>
                  <td className="hidden px-5 py-3.5 text-destiny-grey/70 sm:table-cell">
                    {s.job_title || "—"}
                    {s.department && (
                      <span className="text-destiny-grey/40"> · {s.department}</span>
                    )}
                  </td>
                  <td className="hidden px-5 py-3.5 text-destiny-grey/70 md:table-cell">
                    {EMPLOYMENT_LABELS[s.employment_type]}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setEditing(s)}
                      className="text-destiny-grey/40 transition hover:text-destiny-orange"
                      aria-label="Edit"
                    >
                      <span className="material-symbols-rounded text-xl">edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <StaffModal
          staff={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setError("");
            load();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}
