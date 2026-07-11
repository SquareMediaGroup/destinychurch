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
  HrHeader,
  Badge,
  EmptyState,
  primaryBtn,
} from "@/components/admin/hr/HrUI";
import { JobModal } from "@/components/admin/hr/JobModal";
import { useDialog } from "@/components/DialogProvider";

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
      <HrHeader
        title="Jobs & internships"
        subtitle="Roles published here appear on the public /jobs page."
        back={{ href: "/admin/hr", label: "HR" }}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/hr/applications"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
            >
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

      {error && (
        <p className="mb-4 rounded-xl bg-destiny-red/10 px-4 py-2.5 text-sm text-destiny-red">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-destiny-grey/50">Loading…</p>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon="work"
          title="No roles yet"
          hint="Create your first job or internship to start receiving applications."
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
              <tr>
                <th className="px-5 py-3.5">Role</th>
                <th className="hidden px-5 py-3.5 sm:table-cell">Type</th>
                <th className="hidden px-5 py-3.5 md:table-cell">Closing</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {jobs.map((j) => {
                const closed = isClosed(j);
                return (
                  <tr key={j.id} className="transition hover:bg-[#f5f7fa]">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-destiny-grey">{j.title}</p>
                      <p className="text-xs text-destiny-grey/45">
                        {KIND_LABELS[j.kind]}
                        {j.department && <span> · {j.department}</span>}
                      </p>
                    </td>
                    <td className="hidden px-5 py-3.5 text-destiny-grey/70 sm:table-cell">
                      {EMPLOYMENT_LABELS[j.employment_type]}
                    </td>
                    <td className="hidden px-5 py-3.5 text-destiny-grey/70 md:table-cell">
                      {j.closing_date ? (
                        <span className={closed ? "text-destiny-red" : ""}>
                          {new Date(j.closing_date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {closed && " (closed)"}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => togglePublish(j)} title="Toggle publish">
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
                            className="text-destiny-grey/40 transition hover:text-destiny-orange"
                            aria-label="View live"
                          >
                            <span className="material-symbols-rounded text-xl">
                              open_in_new
                            </span>
                          </a>
                        )}
                        <button
                          onClick={() => setEditing(j)}
                          className="text-destiny-grey/40 transition hover:text-destiny-orange"
                          aria-label="Edit"
                        >
                          <span className="material-symbols-rounded text-xl">edit</span>
                        </button>
                        <button
                          onClick={() => remove(j)}
                          className="text-destiny-grey/40 transition hover:text-destiny-red"
                          aria-label="Delete"
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
