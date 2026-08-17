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
import {
  PageHeader,
  Badge,
  EmptyState,
  ErrorNote,
  ListToolbar,
  FilterChips,
  TableSkeleton,
  primaryBtn,
} from "@/components/admin/AdminUI";
import { useAdminList } from "@/lib/useAdminList";
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

  const list = useAdminList<Staff>({
    items: staff,
    searchKeys: [
      { name: "first_name", weight: 0.3 },
      { name: "last_name", weight: 0.3 },
      { name: "job_title", weight: 0.2 },
      { name: "department", weight: 0.1 },
      { name: "email", weight: 0.1 },
    ],
    filters: [
      {
        key: "status",
        options: (["active", "on_leave", "left"] as StaffStatus[]).map((s) => ({
          value: s,
          label: STATUS_LABELS[s],
        })),
        match: (s, value) => s.status === value,
        // Someone who has left is rarely who you're looking for, but the chip
        // count makes it obvious they're being hidden.
        initial: "active",
      },
    ],
    sorts: {
      name: (a, b) => fullName(a).localeCompare(fullName(b)),
      department: (a, b) => (a.department ?? "").localeCompare(b.department ?? ""),
    },
    defaultSort: { field: "name", direction: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
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

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : staff.length === 0 ? (
        <EmptyState
          icon="badge"
          title="No staff yet"
          hint="Add your first team member to get started."
          action={
            <button className={primaryBtn} onClick={() => setEditing("new")}>
              <span className="material-symbols-rounded text-lg">add</span>
              Add staff
            </button>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search name, role or department"
            noun="person"
            total={list.total}
            shown={list.shown}
            filters={
              <FilterChips
                label="Status"
                options={list.filterOptions("status")}
                value={list.filterValues.status}
                onChange={(v) => list.setFilter("status", v)}
              />
            }
          />

          {list.visible.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="Nobody matches"
              hint="Try a different name, or switch the status filter to All."
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
            <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm">
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
                  {list.visible.map((s) => (
                    <tr key={s.id} className="transition hover:bg-[#f5f7fa]">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/hr/staff/${s.id}`}
                          className="font-bold text-destiny-grey hover:text-destiny-orange"
                        >
                          {fullName(s)}
                        </Link>
                        {s.email && (
                          <p className="text-xs text-destiny-grey/45">{s.email}</p>
                        )}
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
                          aria-label={`Edit ${fullName(s)}`}
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
        </>
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
