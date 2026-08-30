"use client";

import { useCallback, useEffect, useState } from "react";
import { API, CHECKLIST_KIND_LABELS, type ChecklistTemplate } from "@/lib/hr";
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
import { ChecklistTemplateModal } from "@/components/admin/hr/ChecklistUI";
import { useDialog } from "@/components/DialogProvider";

export default function ChecklistTemplatesPage() {
  const { confirm } = useDialog();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ChecklistTemplate | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/checklist-templates`);
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useAdminList<ChecklistTemplate>({
    items: templates,
    searchKeys: ["name"],
    filters: [
      {
        key: "kind",
        options: (Object.keys(CHECKLIST_KIND_LABELS) as (keyof typeof CHECKLIST_KIND_LABELS)[]).map(
          (k) => ({ value: k, label: CHECKLIST_KIND_LABELS[k] }),
        ),
        match: (t, value) => t.kind === value,
      },
    ],
    sorts: { name: (a, b) => a.name.localeCompare(b.name) },
    defaultSort: { field: "name", direction: "asc" },
  });

  async function remove(t: ChecklistTemplate) {
    if (
      !(await confirm({
        title: "Delete template",
        message: `Delete "${t.name}"? Staff checklists already started from it are unaffected.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setError("");
    const res = await fetch(`${API}/checklist-templates/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not delete.");
      return;
    }
    load();
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <PageHeader
        title="Checklists"
        subtitle="Reusable onboarding and offboarding templates."
        back={{ href: "/admin/hr", label: "HR" }}
        action={
          <button className={primaryBtn} onClick={() => setEditing("new")}>
            <span className="material-symbols-rounded text-lg">add</span>
            New template
          </button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon="checklist"
          title="No templates yet"
          hint="Create a template so onboarding a new starter is a click, not a retype."
          action={
            <button className={primaryBtn} onClick={() => setEditing("new")}>
              <span className="material-symbols-rounded text-lg">add</span>
              New template
            </button>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search templates"
            noun="template"
            total={list.total}
            shown={list.shown}
            filters={
              <FilterChips
                label="Kind"
                options={list.filterOptions("kind")}
                value={list.filterValues.kind}
                onChange={(v) => list.setFilter("kind", v)}
              />
            }
          />

          <div className="overflow-x-auto rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                <tr>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Kind</th>
                  <th className="hidden px-5 py-3.5 sm:table-cell">Items</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {list.visible.map((t) => (
                  <tr key={t.id} className="transition hover:bg-[#f5f7fa] dark:hover:bg-white/10">
                    <td className="px-5 py-3.5 font-bold text-destiny-grey dark:text-white">{t.name}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={t.kind === "onboarding" ? "green" : "grey"}>
                        {CHECKLIST_KIND_LABELS[t.kind]}
                      </Badge>
                    </td>
                    <td className="hidden px-5 py-3.5 text-destiny-grey/70 dark:text-white/70 sm:table-cell">
                      {t.items?.length ?? 0}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setEditing(t)}
                          className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-orange"
                          aria-label={`Edit ${t.name}`}
                        >
                          <span className="material-symbols-rounded text-xl">edit</span>
                        </button>
                        <button
                          onClick={() => remove(t)}
                          className="text-destiny-grey/40 dark:text-white/40 transition hover:text-destiny-red"
                          aria-label={`Delete ${t.name}`}
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
        </>
      )}

      {editing && (
        <ChecklistTemplateModal
          template={editing === "new" ? null : editing}
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
