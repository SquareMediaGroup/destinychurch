"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  API,
  EMPLOYMENT_LABELS,
  KIND_LABELS,
  isClosed,
  type Job,
} from "@/lib/jobs";
import {
  PageHeader,
  Badge,
  EmptyState,
  ErrorNote,
  ListToolbar,
  FilterChips,
  TableSkeleton,
  primaryBtn,
  ghostBtn,
} from "@/components/admin/AdminUI";
import { useAdminList } from "@/lib/useAdminList";
import { JobModal } from "@/components/admin/hr/JobModal";
import { useDialog } from "@/components/DialogProvider";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function JobsPage() {
  const { confirm } = useDialog();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Job | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/jobs`);
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useAdminList<Job>({
    items: jobs,
    searchKeys: [
      { name: "title", weight: 0.6 },
      { name: "department", weight: 0.2 },
      { name: "slug", weight: 0.2 },
    ],
    filters: [
      {
        key: "status",
        options: [
          { value: "open", label: "Open" },
          { value: "closed", label: "Closed" },
          { value: "draft", label: "Draft" },
        ],
        match: (job, value) => {
          if (value === "draft") return !job.is_published;
          if (value === "closed") return job.is_published && isClosed(job);
          return job.is_published && !isClosed(job);
        },
      },
    ],
    sorts: {
      title: (a, b) => a.title.localeCompare(b.title),
      closing: (a, b) => (a.closing_date ?? "9999").localeCompare(b.closing_date ?? "9999"),
    },
  });

  async function togglePublish(job: Job) {
    setError("");
    const res = await fetch(`${API}/jobs/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_published: !job.is_published }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not update.");
      return;
    }
    load();
  }

  async function remove(job: Job) {
    if (
      !(await confirm({
        title: "Delete job",
        message: `Delete "${job.title}"? This cannot be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setError("");
    const res = await fetch(`${API}/jobs/${job.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete.");
      return;
    }
    load();
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title="Jobs & internships"
        subtitle="Roles published here appear on the public /jobs page."
        back={{ href: "/admin/hr", label: "HR" }}
        action={
          <div className="flex items-center gap-2">
            <Link href="/admin/hr/applications" className={ghostBtn}>
              <span className="material-symbols-rounded text-lg">inbox</span>
              Applications
            </Link>
            <button className={primaryBtn} onClick={() => setEditing("new")}>
              <span className="material-symbols-rounded text-lg">add</span>
              New role
            </button>
          </div>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon="work"
          title="No roles yet"
          hint="Create your first job or internship to start receiving applications."
          action={
            <button className={primaryBtn} onClick={() => setEditing("new")}>
              <span className="material-symbols-rounded text-lg">add</span>
              New role
            </button>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search roles"
            noun="role"
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
              title="No roles match"
              hint="Try a different title, or clear the filters."
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
                    <th className="px-5 py-3.5">Role</th>
                    <th className="hidden px-5 py-3.5 sm:table-cell">Type</th>
                    <th className="hidden px-5 py-3.5 md:table-cell">Closing</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {list.visible.map((j) => {
                    const closed = isClosed(j);
                    return (
                      <tr key={j.id} className="transition hover:bg-[#f5f7fa] dark:hover:bg-white/10">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-destiny-grey dark:text-white">{j.title}</p>
                          <p className="text-xs text-destiny-grey/45 dark:text-white/45">
                            {KIND_LABELS[j.kind]}
                            {j.department && <span> · {j.department}</span>}
                          </p>
                        </td>
                        <td className="hidden px-5 py-3.5 text-destiny-grey/70 dark:text-white/70 sm:table-cell">
                          {EMPLOYMENT_LABELS[j.employment_type]}
                        </td>
                        <td className="hidden px-5 py-3.5 text-destiny-grey/70 dark:text-white/70 md:table-cell">
                          {j.closing_date ? (
                            <span className={closed ? "text-destiny-red" : ""}>
                              {dateFmt.format(new Date(j.closing_date))}
                              {closed && " (closed)"}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => togglePublish(j)}
                            title={j.is_published ? "Unpublish" : "Publish"}
                          >
                            <Badge tone={j.is_published ? "green" : "grey"}>
                              {j.is_published ? "Published" : "Draft"}
                            </Badge>
                          </button>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-3">
                            {j.is_published && (
                              <a
                                href={`/jobs/${j.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange"
                                aria-label={`View ${j.title} live`}
                              >
                                <span className="material-symbols-rounded text-xl">
                                  open_in_new
                                </span>
                              </a>
                            )}
                            <button
                              onClick={() => setEditing(j)}
                              className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange"
                              aria-label={`Edit ${j.title}`}
                            >
                              <span className="material-symbols-rounded text-xl">edit</span>
                            </button>
                            <button
                              onClick={() => remove(j)}
                              className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-red"
                              aria-label={`Delete ${j.title}`}
                            >
                              <span className="material-symbols-rounded text-xl">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {editing && (
        <JobModal
          job={editing === "new" ? null : editing}
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
