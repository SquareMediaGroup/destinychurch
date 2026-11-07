"use client";

import { useEffect, useState } from "react";
import { API, type PostFields } from "@/lib/posts";
import type { PostTemplate } from "@/lib/postTemplates";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";

interface SavedTemplateRow {
  id: string;
  label: string;
  description: string | null;
  fields: Partial<PostFields>;
  created_by: string | null;
}

/**
 * Templates admins saved from the editor ("Save as template"), shown above the
 * built-in starters in the New post picker. Renders nothing until there's at
 * least one, so the picker looks as it always has on a fresh site.
 */
export function SavedTemplates({ onPick }: { onPick: (template: PostTemplate) => void }) {
  const { confirm } = useDialog();
  const toast = useToast();
  const [rows, setRows] = useState<SavedTemplateRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/templates`)
      .then((res) => res.json())
      .then((data) => !cancelled && Array.isArray(data) && setRows(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(row: SavedTemplateRow) {
    if (
      !(await confirm({
        title: `Delete the template “${row.label}”?`,
        message: "Pages already made from it aren't affected.",
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    const res = await fetch(`${API}/templates/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Couldn't delete the template.");
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  }

  if (rows.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
        Saved templates
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-stretch rounded-2xl border border-black/10 dark:border-white/10">
            <button
              type="button"
              onClick={() =>
                onPick({
                  id: `saved-${row.id}`,
                  label: row.label,
                  description: row.description ?? "",
                  icon: "bookmark",
                  fields: row.fields,
                })
              }
              className="flex min-w-0 flex-1 items-start gap-3 rounded-l-2xl p-3 text-left transition hover:bg-destiny-orange/5"
            >
              <span className="material-symbols-rounded text-xl text-destiny-orange" aria-hidden="true">
                bookmark
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-destiny-grey dark:text-white">{row.label}</span>
                <span className="block truncate text-[11px] text-destiny-grey/55 dark:text-white/55">
                  {row.description || (row.created_by ? `Saved by ${row.created_by}` : "Saved template")}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => remove(row)}
              aria-label={`Delete the template ${row.label}`}
              className="flex w-10 shrink-0 items-center justify-center rounded-r-2xl text-destiny-grey/35 transition hover:bg-black/5 hover:text-destiny-red dark:text-white/35"
            >
              <span className="material-symbols-rounded text-lg" aria-hidden="true">delete</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
        Starters
      </p>
    </div>
  );
}
