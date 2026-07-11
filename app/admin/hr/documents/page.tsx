"use client";

import { useEffect, useState, useCallback } from "react";
import {
  API,
  fullName,
  formatDate,
  formatBytes,
  DOCUMENT_CATEGORY_LABELS,
  type Staff,
  type HrDocument,
} from "@/lib/hr";
import { HrHeader, Badge, EmptyState, primaryBtn } from "@/components/admin/hr/HrUI";
import { DocumentModal } from "@/components/admin/hr/modals";
import { useDialog } from "@/components/DialogProvider";

async function downloadDocument(id: string): Promise<string | null> {
  const res = await fetch(`${API}/documents/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.url ?? null;
}

export default function DocumentsPage() {
  const { confirm } = useDialog();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [docs, setDocs] = useState<HrDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const [s, d] = await Promise.all([
      fetch(`${API}/staff`).then((r) => r.json()),
      fetch(`${API}/documents`).then((r) => r.json()),
    ]);
    setStaff(Array.isArray(s) ? s : []);
    setDocs(Array.isArray(d) ? d : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function open(id: string) {
    const url = await downloadDocument(id);
    if (url) window.open(url, "_blank", "noopener");
    else setError("Could not open document.");
  }

  async function remove(id: string) {
    if (
      !(await confirm({
        title: "Delete document",
        message: "Delete this document? This cannot be undone.",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    const res = await fetch(`${API}/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not delete document.");
      return;
    }
    load();
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <HrHeader
        title="Documents"
        subtitle="Contracts, policies and staff files — stored privately."
        back={{ href: "/admin/hr", label: "HR" }}
        action={
          <button className={primaryBtn} onClick={() => setAdding(true)}>
            <span className="material-symbols-rounded text-lg">upload</span>
            Upload
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
      ) : docs.length === 0 ? (
        <EmptyState
          icon="folder_open"
          title="No documents yet"
          hint="Upload contracts, policies or other staff files."
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
              <tr>
                <th className="px-5 py-3.5">Title</th>
                <th className="hidden px-5 py-3.5 sm:table-cell">Category</th>
                <th className="hidden px-5 py-3.5 md:table-cell">Belongs to</th>
                <th className="hidden px-5 py-3.5 lg:table-cell">Added</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {docs.map((d) => (
                <tr key={d.id} className="transition hover:bg-[#f5f7fa]">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-destiny-grey">{d.title}</p>
                    <p className="text-xs text-destiny-grey/45">
                      {d.file_name} · {formatBytes(d.size_bytes)}
                    </p>
                  </td>
                  <td className="hidden px-5 py-3.5 sm:table-cell">
                    <Badge tone="blue">{DOCUMENT_CATEGORY_LABELS[d.category]}</Badge>
                  </td>
                  <td className="hidden px-5 py-3.5 text-destiny-grey/70 md:table-cell">
                    {d.hr_staff ? fullName(d.hr_staff) : "Org-wide"}
                  </td>
                  <td className="hidden px-5 py-3.5 text-destiny-grey/55 lg:table-cell">
                    {formatDate(d.created_at)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => open(d.id)}
                        className="text-destiny-grey/40 transition hover:text-destiny-orange"
                        aria-label="Download"
                      >
                        <span className="material-symbols-rounded text-xl">download</span>
                      </button>
                      <button
                        onClick={() => remove(d.id)}
                        className="text-destiny-grey/40 transition hover:text-destiny-red"
                        aria-label="Delete"
                      >
                        <span className="material-symbols-rounded text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <DocumentModal
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
