"use client";

import { useCallback, useMemo, useState } from "react";
import {
  API,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONE,
  type ApplicationStatus,
  type JobApplication,
} from "@/lib/jobs";
import {
  PageHeader,
  Badge,
  EmptyState,
  ErrorNote,
  ListToolbar,
  FilterChips,
  TableSkeleton,
  BulkBar,
} from "@/components/admin/AdminUI";
import { useAdminList, useRowSelection } from "@/lib/useAdminList";
import { fetchAdminArray, useAdminLoader } from "@/lib/useAdminLoader";
import { useDialog } from "@/components/DialogProvider";
import { downloadCsv, toCsv } from "@/lib/csv";

type WithCv = JobApplication & { cv_url?: string | null };

const STATUSES: ApplicationStatus[] = [
  "new",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
];

export default function ApplicationsPage() {
  const { confirm } = useDialog();
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [open, setOpen] = useState<WithCv | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setApps(await fetchAdminArray<JobApplication>(`${API}/applications`));
  }, []);

  const { loading, error, setError, reload } = useAdminLoader(load);

  const list = useAdminList<JobApplication>({
    items: apps,
    searchKeys: [
      { name: "first_name", weight: 0.25 },
      { name: "last_name", weight: 0.25 },
      { name: "email", weight: 0.25 },
      { name: "job_title", weight: 0.25 },
    ],
    filters: [
      {
        key: "status",
        options: STATUSES.map((s) => ({
          value: s,
          label: APPLICATION_STATUS_LABELS[s],
        })),
        match: (a, value) => a.status === value,
      },
    ],
    sorts: {
      applied: (a, b) => a.created_at.localeCompare(b.created_at),
      name: (a, b) =>
        `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`),
    },
    defaultSort: { field: "applied", direction: "desc" },
  });

  const selection = useRowSelection(apps);
  const visibleIds = useMemo(() => list.visible.map((a) => a.id), [list.visible]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selection.selected.has(id));

  async function openDetail(app: JobApplication) {
    setError("");
    const res = await fetch(`${API}/applications/${app.id}`);
    const data = await res.json().catch(() => null);
    setOpen(data && !data.error ? data : (app as WithCv));
  }

  async function setStatus(id: string, status: ApplicationStatus) {
    const res = await fetch(`${API}/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update.");
      return;
    }
    setApps((list) => list.map((a) => (a.id === id ? { ...a, status } : a)));
    setOpen((o) => (o && o.id === id ? { ...o, status } : o));
  }

  async function remove(id: string) {
    if (
      !(await confirm({
        title: "Delete application",
        message: "Delete this application? This cannot be undone.",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    const res = await fetch(`${API}/applications/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete.");
      return;
    }
    setApps((list) => list.filter((a) => a.id !== id));
    setOpen(null);
  }

  async function bulkSetStatus(status: ApplicationStatus) {
    const ids = [...selection.selected];
    if (ids.length === 0) return;
    setWorking(true);
    setError("");
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${API}/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }).then((r) => {
          if (!r.ok) throw new Error();
        }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) {
      setError(`${failed} of ${ids.length} could not be moved to “${APPLICATION_STATUS_LABELS[status]}”.`);
    }
    selection.clear();
    setWorking(false);
    reload();
  }

  async function bulkDelete() {
    const ids = [...selection.selected];
    if (ids.length === 0) return;
    if (
      !(await confirm({
        title: `Delete ${ids.length} application${ids.length === 1 ? "" : "s"}`,
        message: `This permanently deletes ${ids.length} application${ids.length === 1 ? "" : "s"} and any uploaded CVs. This cannot be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setWorking(true);
    setError("");
    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${API}/applications/${id}`, { method: "DELETE" }).then((r) => {
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
    const rows = apps.filter((a) => ids.has(a.id));
    const csv = toCsv(
      ["Name", "Email", "Role", "Applied", "Status"],
      rows.map((a) => [
        `${a.first_name} ${a.last_name}`,
        a.email,
        a.job_title,
        new Date(a.created_at).toISOString().slice(0, 10),
        APPLICATION_STATUS_LABELS[a.status],
      ]),
    );
    downloadCsv(`destiny-applications-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title="Applications"
        subtitle="Candidates who have applied through the public /jobs page."
        back={{ href: "/admin/hr/jobs", label: "Jobs & internships" }}
      />

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : apps.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="No applications yet"
          hint="Applications submitted on the website will appear here."
        />
      ) : (
        <>
        <ListToolbar
          search={list.search}
          onSearchChange={list.setSearch}
          searchPlaceholder="Search candidate, email or role"
          noun="application"
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
          <BulkBar count={selection.count} noun="application" onClear={selection.clear}>
            <button
              className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-bold text-destiny-grey/70 dark:text-white/70 transition hover:bg-black/10 disabled:opacity-50"
              disabled={working}
              onClick={exportSelectedCsv}
            >
              Export selected as CSV
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                  s === "rejected"
                    ? "bg-destiny-red/10 text-destiny-red hover:bg-destiny-red/20"
                    : s === "hired" || s === "shortlisted"
                      ? "bg-destiny-green/10 text-destiny-green hover:bg-destiny-green/20"
                      : "bg-black/5 text-destiny-grey/70 dark:text-white/70 hover:bg-black/10"
                }`}
                disabled={working}
                onClick={() => bulkSetStatus(s)}
              >
                Mark {APPLICATION_STATUS_LABELS[s]}
              </button>
            ))}
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
            title="No applications match"
            hint="Try a name, an email address, or the role applied for."
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
                <th className="px-5 py-3.5">Candidate</th>
                <th className="hidden px-5 py-3.5 sm:table-cell">Role</th>
                <th className="hidden px-5 py-3.5 md:table-cell">Applied</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {list.visible.map((a) => (
                <tr
                  key={a.id}
                  className={`cursor-pointer transition hover:bg-[#f5f7fa] dark:hover:bg-white/10 ${
                    selection.selected.has(a.id) ? "bg-destiny-orange/5" : ""
                  }`}
                  onClick={() => openDetail(a)}
                >
                  <td className="w-10 py-3.5 pl-5 pr-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${a.first_name} ${a.last_name}`}
                      checked={selection.selected.has(a.id)}
                      onChange={() => selection.toggle(a.id)}
                      className="accent-destiny-orange"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-destiny-grey dark:text-white">
                      {a.first_name} {a.last_name}
                    </p>
                    <p className="text-xs text-destiny-grey/45 dark:text-white/45">{a.email}</p>
                  </td>
                  <td className="hidden px-5 py-3.5 text-destiny-grey/70 dark:text-white/70 sm:table-cell">
                    {a.job_title}
                  </td>
                  <td className="hidden px-5 py-3.5 text-destiny-grey/70 dark:text-white/70 md:table-cell">
                    {new Date(a.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={APPLICATION_STATUS_TONE[a.status]}>
                      {APPLICATION_STATUS_LABELS[a.status]}
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

      {open && (
        <ApplicationDetail
          app={open}
          onClose={() => setOpen(null)}
          onStatus={(s) => setStatus(open.id, s)}
          onDelete={() => remove(open.id)}
        />
      )}
    </div>
  );
}

function ApplicationDetail({
  app,
  onClose,
  onStatus,
  onDelete,
}: {
  app: WithCv;
  onClose: () => void;
  onStatus: (s: ApplicationStatus) => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-6 shadow-xl dark:bg-destiny-grey-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-destiny-grey dark:text-white">
              {app.first_name} {app.last_name}
            </h2>
            <p className="text-sm text-destiny-grey/55 dark:text-white/55">
              Applied for {app.job_title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-grey dark:hover:text-white"
            aria-label="Close"
          >
            <span className="material-symbols-rounded text-2xl" aria-hidden="true">close</span>
          </button>
        </div>

        <dl className="mb-5 space-y-3 rounded-2xl bg-[#f5f7fa] p-4 text-sm">
          <Field label="Email">
            <a
              href={`mailto:${app.email}`}
              className="font-bold text-destiny-orange hover:underline"
            >
              {app.email}
            </a>
          </Field>
          {app.phone && (
            <Field label="Phone">
              <a href={`tel:${app.phone}`} className="text-destiny-grey dark:text-white">
                {app.phone}
              </a>
            </Field>
          )}
          <Field label="Applied">
            <span className="text-destiny-grey dark:text-white">
              {new Date(app.created_at).toLocaleString("en-GB")}
            </span>
          </Field>
          {app.cv_name && (
            <Field label="CV">
              {app.cv_url ? (
                <a
                  href={app.cv_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-bold text-destiny-orange hover:underline"
                >
                  <span className="material-symbols-rounded text-base" aria-hidden="true">download</span>
                  {app.cv_name}
                </a>
              ) : (
                <span className="text-destiny-grey/60 dark:text-white/60">{app.cv_name}</span>
              )}
            </Field>
          )}
        </dl>

        {app.cover_letter && (
          <div className="mb-5">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
              Cover note
            </p>
            <p className="whitespace-pre-wrap rounded-2xl border border-black/5 p-4 text-sm leading-relaxed text-destiny-grey/80 dark:text-white/80">
              {app.cover_letter}
            </p>
          </div>
        )}

        <div className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
            Status
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => onStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  app.status === s
                    ? "bg-destiny-orange text-white"
                    : "bg-[#f5f7fa] text-destiny-grey/60 dark:text-white/60 hover:bg-black/5"
                }`}
              >
                {APPLICATION_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-destiny-red/70 transition hover:text-destiny-red"
          >
            <span className="material-symbols-rounded text-lg" aria-hidden="true">delete</span>
            Delete
          </button>
          <a
            href={`mailto:${app.email}?subject=Your application for ${encodeURIComponent(app.job_title)}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
          >
            <span className="material-symbols-rounded text-lg" aria-hidden="true">mail</span>
            Reply
          </a>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
        {label}
      </dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
