"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API, type TrainingCategory } from "@/lib/training";
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
import { CategoryModal } from "@/components/admin/training/CategoryModal";
import { useReorder } from "@/components/admin/training/useReorder";
import { useDialog } from "@/components/DialogProvider";

export default function TrainingCategoriesPage() {
  const { confirm } = useDialog();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<TrainingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<TrainingCategory | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/categories`);
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setEditing("new");
  }, [searchParams]);

  const list = useAdminList<TrainingCategory>({
    items: categories,
    searchKeys: [
      { name: "name", weight: 0.7 },
      { name: "description", weight: 0.3 },
    ],
    filters: [
      {
        key: "status",
        options: [
          { value: "published", label: "Published" },
          { value: "hidden", label: "Hidden" },
        ],
        match: (c, value) => (value === "published" ? c.is_published : !c.is_published),
      },
    ],
  });

  const { rowProps } = useReorder(
    categories,
    setCategories,
    (id) => `${API}/categories/${id}`,
    setError,
  );

  // Rows are hand-ordered and that order is what the public page shows, so
  // dragging a row inside a filtered view would write a meaningless
  // sort_order. Reordering is only offered on the full, unfiltered list.
  const canReorder = !list.isFiltered;

  async function remove(category: TrainingCategory) {
    if (
      !(await confirm({
        title: "Delete category",
        message: `Delete "${category.name}"? Its sub-groups and posts will also be deleted. This cannot be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setError("");
    const res = await fetch(`${API}/categories/${category.id}`, { method: "DELETE" });
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
        title="Training"
        subtitle="Categories shown on the public /training page. Open one to manage its sub-groups."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          <button className={primaryBtn} onClick={() => setEditing("new")}>
            <span className="material-symbols-rounded text-lg">add</span>
            New category
          </button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {loading ? (
        <TableSkeleton columns={3} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon="school"
          title="No categories yet"
          hint="Create your first training category, like Production or Hospitality."
          action={
            <button className={primaryBtn} onClick={() => setEditing("new")}>
              <span className="material-symbols-rounded text-lg">add</span>
              New category
            </button>
          }
        />
      ) : (
        <>
          <ListToolbar
            search={list.search}
            onSearchChange={list.setSearch}
            searchPlaceholder="Search categories"
            noun="category"
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

          {!canReorder && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-destiny-grey/45">
              <span className="material-symbols-rounded text-base">info</span>
              Clear the search to drag categories into a new order.
            </p>
          )}

          {list.visible.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="No categories match"
              hint="Try a different word, or clear the filters."
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
                <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
                  <tr>
                    {canReorder && <th className="w-10 px-2 py-3.5"></th>}
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {list.visible.map((c) => {
                    const idx = categories.indexOf(c);
                    return (
                      <tr
                        key={c.id}
                        {...(canReorder ? rowProps(idx) : {})}
                        className="transition hover:bg-[#f5f7fa] dark:hover:bg-white/10"
                      >
                        {canReorder && (
                          <td className="px-2 py-3.5 text-center">
                            <span
                              className="material-symbols-rounded cursor-grab text-xl text-destiny-grey/25 active:cursor-grabbing"
                              title="Drag to reorder"
                            >
                              drag_indicator
                            </span>
                          </td>
                        )}
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/admin/training/${c.id}`}
                            className="flex items-center gap-2.5 font-bold text-destiny-grey transition hover:text-destiny-orange"
                          >
                            {c.icon && (
                              <span className="material-symbols-rounded text-xl text-destiny-orange">
                                {c.icon}
                              </span>
                            )}
                            {c.name}
                          </Link>
                          {c.description && (
                            <p className="mt-0.5 text-xs text-destiny-grey/45">
                              {c.description}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={c.is_published ? "green" : "grey"}>
                            {c.is_published ? "Published" : "Hidden"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/admin/training/${c.id}`}
                              className="text-destiny-grey/40 transition hover:text-destiny-orange"
                              aria-label={`Manage sub-groups in ${c.name}`}
                              title="Manage sub-groups"
                            >
                              <span className="material-symbols-rounded text-xl">
                                folder_open
                              </span>
                            </Link>
                            <button
                              onClick={() => setEditing(c)}
                              className="text-destiny-grey/40 transition hover:text-destiny-orange"
                              aria-label={`Edit ${c.name}`}
                            >
                              <span className="material-symbols-rounded text-xl">edit</span>
                            </button>
                            <button
                              onClick={() => remove(c)}
                              className="text-destiny-grey/40 transition hover:text-destiny-red"
                              aria-label={`Delete ${c.name}`}
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
        <CategoryModal
          category={editing === "new" ? null : editing}
          nextSortOrder={categories.length}
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
