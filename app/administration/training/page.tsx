"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { API, type TrainingCategory } from "@/lib/training";
import {
  HrHeader,
  Badge,
  EmptyState,
  primaryBtn,
} from "@/components/administration/hr/HrUI";
import { CategoryModal } from "@/components/administration/training/CategoryModal";

export default function TrainingCategoriesPage() {
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

  async function remove(category: TrainingCategory) {
    if (
      !confirm(
        `Delete "${category.name}"? Its sub-groups and posts will also be deleted. This cannot be undone.`,
      )
    )
      return;
    setError("");
    const res = await fetch(`${API}/categories/${category.id}`, {
      method: "DELETE",
    });
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
        title="Training"
        subtitle="Categories shown on the public /training page. Open one to manage its sub-groups."
        back={{ href: "/administration", label: "Administration" }}
        action={
          <button className={primaryBtn} onClick={() => setEditing("new")}>
            <span className="material-symbols-rounded text-lg">add</span>
            New category
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
      ) : categories.length === 0 ? (
        <EmptyState
          icon="school"
          title="No categories yet"
          hint="Create your first training category, like Production or Hospitality."
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
              <tr>
                <th className="px-5 py-3.5">Category</th>
                <th className="hidden px-5 py-3.5 sm:table-cell">Order</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {categories.map((c) => (
                <tr key={c.id} className="transition hover:bg-[#f5f7fa]">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/administration/training/${c.id}`}
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
                  <td className="hidden px-5 py-3.5 text-destiny-grey/70 sm:table-cell">
                    {c.sort_order}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={c.is_published ? "green" : "grey"}>
                      {c.is_published ? "Published" : "Hidden"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/administration/training/${c.id}`}
                        className="text-destiny-grey/40 transition hover:text-destiny-orange"
                        aria-label="Manage sub-groups"
                        title="Manage sub-groups"
                      >
                        <span className="material-symbols-rounded text-xl">
                          folder_open
                        </span>
                      </Link>
                      <button
                        onClick={() => setEditing(c)}
                        className="text-destiny-grey/40 transition hover:text-destiny-orange"
                        aria-label="Edit"
                      >
                        <span className="material-symbols-rounded text-xl">edit</span>
                      </button>
                      <button
                        onClick={() => remove(c)}
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

      {editing && (
        <CategoryModal
          category={editing === "new" ? null : editing}
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
