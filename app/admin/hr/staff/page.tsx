"use client";

import { useMemo, useState, useCallback } from "react";
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
  BulkBar,
  primaryBtn,
} from "@/components/admin/AdminUI";
import { useAdminList, useRowSelection } from "@/lib/useAdminList";
import { fetchAdminArray, useAdminLoader } from "@/lib/useAdminLoader";
import { StaffModal } from "@/components/admin/hr/modals";
import { useDialog } from "@/components/DialogProvider";
import { downloadCsv, toCsv } from "@/lib/csv";

const STATUS_TONE: Record<StaffStatus, string> = {
  active: "green",
  on_leave: "orange",
  left: "grey",
};

export default function StaffPage() {
  const { confirm } = useDialog();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setStaff(await fetchAdminArray<Staff>(`${API}/staff`));
  }, []);

  const { loading, error, setError, reload } = useAdminLoader(load);

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

  const selection = useRowSelection(staff);
  const visibleIds = useMemo(() => list.visible.map((s) => s.id), [list.visible]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selection.selected.has(id));

  async function bulkDelete() {
    const ids = [...selection.selected];
    if (ids.length === 0) return;
    if (
      !(await confirm({
        title: `Delete ${ids.length} staff member${ids.length === 1 ? "" : "s"}`,
        message: `This permanently deletes ${ids.length} staff record${ids.length === 1 ? "" : "s"}, including any staff-only login. This cannot be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setWorking(true);
    setError("");
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${API}/staff/${id}`, { method: "DELETE" }).then((r) => {
          if (!r.ok) throw new Error();
        }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) setError(`${failed} of ${ids.length} could not be deleted.`);
    selection.clear();
    setWorking(false);
    reload();
  }

  function exportSelectedCsv() {
    const ids = selection.selected;
    const rows = staff.filter((s) => ids.has(s.id));
    const csv = toCsv(
      ["Name", "Role", "Department", "Type", "Status", "Email", "Start date"],
      rows.map((s) => [
        fullName(s),
        s.job_title ?? "",
        s.department ?? "",
        EMPLOYMENT_LABELS[s.employment_type],
        STATUS_LABELS[s.status],
        s.email ?? "",
        s.start_date ?? "",
      ]),
    );
    downloadCsv(`destiny-staff-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title="Staff directory"
        subtitle="Everyone on the team and their key details."
        back={{ href: "/admin/hr", label: "HR" }}
        action={
          <button className={primaryBtn} onClick={() => setEditing("new")}>
            <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
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
              <span className="material-symbols-rounded text-lg" aria-hidden="true">add</span>
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
          >
            <BulkBar count={selection.count} noun="staff member" onClear={selection.clear}>
              <button
                className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-bold text-destiny-grey/70 dark:text-white/70 transition hover:bg-black/10 disabled:opacity-50"
                disabled={working}
                onClick={exportSelectedCsv}
              >
                Export selected as CSV
              </button>
              <button
                className="rounded-lg bg-destiny-red/10 px-3 py-1.5 text-xs font-bold text-destiny-red transition hover:bg-destiny-red/20 disabled:opacity-50"
                disabled={working}
                onClick={bulkDelete}
              >
                Delete
              </button>
            </BulkBar>
          </ListToolbar>

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
            <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                  <tr>
                    <th className="w-10 pl-5 pr-0 py-3.5">
                      <input
                        type="checkbox"
                        aria-label="Select all shown"
                        checked={allVisibleSelected}
                        onChange={() => selection.toggleAll(visibleIds)}
                        className="accent-destiny-orange"
                      />
                    </th>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="hidden px-5 py-3.5 sm:table-cell">Role</th>
                    <th className="hidden px-5 py-3.5 md:table-cell">Type</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {list.visible.map((s) => (
                    <tr
                      key={s.id}
                      className={`transition hover:bg-[#f5f7fa] dark:hover:bg-white/10 ${
                        selection.selected.has(s.id) ? "bg-destiny-orange/5" : ""
                      }`}
                    >
                      <td className="w-10 py-3.5 pl-5 pr-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${fullName(s)}`}
                          checked={selection.selected.has(s.id)}
                          onChange={() => selection.toggle(s.id)}
                          className="accent-destiny-orange"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/hr/staff/${s.id}`}
                          className="font-bold text-destiny-grey dark:text-white hover:text-destiny-orange"
                        >
                          {fullName(s)}
                        </Link>
                        {s.email && (
                          <p className="text-xs text-destiny-grey/45 dark:text-white/45">{s.email}</p>
                        )}
                      </td>
                      <td className="hidden px-5 py-3.5 text-destiny-grey/70 dark:text-white/70 sm:table-cell">
                        {s.job_title || "—"}
                        {s.department && (
                          <span className="text-destiny-grey/40 dark:text-white/40"> · {s.department}</span>
                        )}
                      </td>
                      <td className="hidden px-5 py-3.5 text-destiny-grey/70 dark:text-white/70 md:table-cell">
                        {EMPLOYMENT_LABELS[s.employment_type]}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABELS[s.status]}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setEditing(s)}
                          className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange"
                          aria-label={`Edit ${fullName(s)}`}
                        >
                          <span className="material-symbols-rounded text-xl" aria-hidden="true">edit</span>
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
            reload();
          }}
          onError={setError}
        />
      )}
    </div>
  );
}
