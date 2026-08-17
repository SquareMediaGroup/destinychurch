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
  type DocumentCategory,
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

  const categories = Object.keys(DOCUMENT_CATEGORY_LABELS) as DocumentCategory[];

  const list = useAdminList<HrDocument>({
    items: docs,
    searchKeys: [
      { name: "title", weight: 0.5 },
      { name: "file_name", weight: 0.2 },
      // Nested paths let "find Sarah's contract" work from the person's name.
      { name: "hr_staff.first_name", weight: 0.15 },
      { name: "hr_staff.last_name", weight: 0.15 },
    ],
    filters: [
      {
        key: "category",
        options: categories.map((c) => ({
          value: c,
          label: DOCUMENT_CATEGORY_LABELS[c],
        })),
        match: (d, value) => d.category === value,
      },
      {
        key: "scope",
        options: [
          { value: "person", label: "Personal" },
          { value: "org", label: "Org-wide" },
        ],
        match: (d, value) => (value === "org" ? !d.hr_staff : Boolean(d.hr_staff)),
      },
    ],
    sorts: {
      added: (a, b) => a.created_at.localeCompare(b.created_at),
      title: (a, b) => a.title.localeCompare(b.title),
    },
    defaultSort: { field: "added", direction: "desc" },
  });

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
      <PageHeader
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

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={4} />
      ) : docs.length === 0 ? (
        <EmptyState
          icon="folder_open"
          title="No documents yet"
          hint="Upload contracts, policies or other staff files."
          action={
            <button className={primaryBtn} onClick={() => setAdding(true)}>
              <span className="material-symbols-rounded text-lg">upload</span>
              Upload
            </button>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search title, file name or person"
            noun="document"
            total={list.total}
            shown={list.shown}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <FilterChips
                  label="Category"
                  options={list.filterOptions("category")}
                  value={list.filterValues.category}
                  onChange={(v) => list.setFilter("category", v)}
                />
                <FilterChips
                  label="Scope"
                  options={list.filterOptions("scope").filter((o) => o.value !== "all")}
                  value={list.filterValues.scope}
                  onChange={(v) =>
                    list.setFilter("scope", list.filterValues.scope === v ? "all" : v)
                  }
                />
              </div>
            }
          />

          {list.visible.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No documents match"
              hint="Try the document title, the file name, or whose file it is."
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
                    <th className="px-5 py-3.5">Title</th>
                    <th className="hidden px-5 py-3.5 sm:table-cell">Category</th>
                    <th className="hidden px-5 py-3.5 md:table-cell">Belongs to</th>
                    <th className="hidden px-5 py-3.5 lg:table-cell">Added</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {list.visible.map((d) => (
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
                            aria-label={`Download ${d.title}`}
                          >
                            <span className="material-symbols-rounded text-xl">download</span>
                          </button>
                          <button
                            onClick={() => remove(d.id)}
                            className="text-destiny-grey/40 transition hover:text-destiny-red"
                            aria-label={`Delete ${d.title}`}
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
        </>
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
