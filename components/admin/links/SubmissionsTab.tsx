"use client";

// Responses sent through this page's form blocks, newest first, with a CSV
// export and per-response delete (people ask for their details to be removed).

import { useCallback, useEffect, useState } from "react";
import { EmptyState, ErrorNote, TableSkeleton } from "@/components/admin/AdminUI";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";

interface Submission {
  id: string;
  block_label: string | null;
  email: string | null;
  /** In the order the form asked. */
  data: { id: string; label: string; value: string | boolean }[];
  created_at: string;
}

export default function SubmissionsTab({ pageId }: { pageId: string }) {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<string>("");
  const { confirm } = useDialog();
  const toast = useToast();

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/links/${pageId}/submissions`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load responses");
      setRows(data.submissions as Submission[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load responses");
      setRows([]);
    }
  }, [pageId]);

  useEffect(() => {
    load();
  }, [load]);

  if (rows === null) return <TableSkeleton rows={4} columns={3} />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const forms = [...new Set(rows.map((r) => r.block_label ?? "Form"))];
  const shown = form ? rows.filter((r) => (r.block_label ?? "Form") === form) : rows;

  if (rows.length === 0)
    return (
      <EmptyState
        icon="inbox"
        title="No responses yet"
        hint="When someone fills in a form block on this page, it shows up here."
      />
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {forms.length > 1 ? (
          <select
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-destiny-grey-800"
            value={form}
            onChange={(e) => setForm(e.target.value)}
            aria-label="Filter by form"
          >
            <option value="">All forms ({rows.length})</option>
            {forms.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm font-bold text-destiny-grey/60 dark:text-white/60">
            {rows.length} response{rows.length === 1 ? "" : "s"}
          </p>
        )}
        <a
          href={`/api/admin/links/${pageId}/submissions?format=csv`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-sm font-bold text-destiny-grey/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70"
        >
          <span className="material-symbols-rounded text-lg" aria-hidden="true">download</span>
          Download CSV
        </a>
      </div>

      <ul className="space-y-2">
        {shown.map((row) => (
          <li key={row.id} className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/8 dark:bg-destiny-grey-800">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-destiny-orange">{row.block_label ?? "Form"}</p>
                <p className="text-xs text-destiny-grey/45 dark:text-white/45">
                  {new Date(row.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <button
                type="button"
                aria-label="Delete this response"
                title="Delete this response"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Delete this response?",
                    message: "It will be removed permanently. Use this when someone asks for their details to be deleted.",
                    confirmLabel: "Delete",
                    tone: "danger",
                  });
                  if (!ok) return;
                  const res = await fetch(`/api/admin/links/${pageId}/submissions?submission=${row.id}`, { method: "DELETE" });
                  if (!res.ok) {
                    toast.error("Couldn't delete that response.");
                    return;
                  }
                  setRows((prev) => (prev ?? []).filter((r) => r.id !== row.id));
                  toast.success("Response deleted", "Deleted");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-destiny-grey/40 hover:bg-destiny-red/5 hover:text-destiny-red"
              >
                <span className="material-symbols-rounded text-lg" aria-hidden="true">delete</span>
              </button>
            </div>
            <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,10rem)_1fr]">
              {(Array.isArray(row.data) ? row.data : []).map((v) => (
                <div key={v.id} className="contents">
                  <dt className="text-xs font-bold text-destiny-grey/50 dark:text-white/50">{v.label}</dt>
                  <dd className="whitespace-pre-line break-words text-sm text-destiny-grey dark:text-white">
                    {typeof v.value === "boolean" ? (v.value ? "Yes" : "No") : v.value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
