"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  API,
  type TrainingCategory,
  type TrainingSubgroup,
} from "@/lib/training";
import {
  HrHeader,
  Badge,
  EmptyState,
  primaryBtn,
} from "@/components/administration/hr/HrUI";
import { SubgroupModal } from "@/components/administration/training/SubgroupModal";
import { useReorder } from "@/components/administration/training/useReorder";
import { useDialog } from "@/components/DialogProvider";

export default function TrainingSubgroupsPage() {
  const { confirm } = useDialog();
  const { categoryId } = useParams<{ categoryId: string }>();
  const [category, setCategory] = useState<TrainingCategory | null>(null);
  const [subgroups, setSubgroups] = useState<TrainingSubgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<TrainingSubgroup | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const [catRes, subRes] = await Promise.all([
        fetch(`${API}/categories/${categoryId}`),
        fetch(`${API}/subgroups?category_id=${categoryId}`),
      ]);
      setCategory(catRes.ok ? await catRes.json() : null);
      const data = await subRes.json();
      setSubgroups(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    load();
  }, [load]);

  const { rowProps } = useReorder(
    subgroups,
    setSubgroups,
    (id) => `${API}/subgroups/${id}`,
    setError,
  );

  async function remove(sub: TrainingSubgroup) {
    if (
      !(await confirm({
        title: "Delete sub-group",
        message: `Delete "${sub.name}"? Its posts will also be deleted. This cannot be undone.`,
        confirmLabel: "Delete",
        tone: "danger",
      }))
    )
      return;
    setError("");
    const res = await fetch(`${API}/subgroups/${sub.id}`, { method: "DELETE" });
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
        title={category ? `${category.name} — sub-groups` : "Sub-groups"}
        subtitle="Each sub-group can have its own password. Open one to manage its posts."
        back={{ href: "/administration/training", label: "Training" }}
        action={
          <button className={primaryBtn} onClick={() => setEditing("new")}>
            <span className="material-symbols-rounded text-lg">add</span>
            New sub-group
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
      ) : subgroups.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No sub-groups yet"
          hint="Add a sub-group like Sound or AV, then set its password."
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
              <tr>
                <th className="w-10 px-2 py-3.5"></th>
                <th className="px-5 py-3.5">Sub-group</th>
                <th className="px-5 py-3.5">Access</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {subgroups.map((s, idx) => (
                <tr
                  key={s.id}
                  {...rowProps(idx)}
                  className="transition hover:bg-[#f5f7fa]"
                >
                  <td className="px-2 py-3.5 text-center">
                    <span
                      className="material-symbols-rounded cursor-grab text-xl text-destiny-grey/25 active:cursor-grabbing"
                      title="Drag to reorder"
                    >
                      drag_indicator
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/administration/training/${categoryId}/${s.id}`}
                      className="font-bold text-destiny-grey transition hover:text-destiny-orange"
                    >
                      {s.name}
                    </Link>
                    {s.description && (
                      <p className="mt-0.5 text-xs text-destiny-grey/45">
                        {s.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={s.has_password ? "orange" : "grey"}>
                      {s.has_password ? "Password set" : "Open"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={s.is_published ? "green" : "grey"}>
                      {s.is_published ? "Published" : "Hidden"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/administration/training/${categoryId}/${s.id}`}
                        className="text-destiny-grey/40 transition hover:text-destiny-orange"
                        aria-label="Manage posts"
                        title="Manage posts"
                      >
                        <span className="material-symbols-rounded text-xl">
                          article
                        </span>
                      </Link>
                      <button
                        onClick={() => setEditing(s)}
                        className="text-destiny-grey/40 transition hover:text-destiny-orange"
                        aria-label="Edit"
                      >
                        <span className="material-symbols-rounded text-xl">edit</span>
                      </button>
                      <button
                        onClick={() => remove(s)}
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
        <SubgroupModal
          subgroup={editing === "new" ? null : editing}
          categoryId={categoryId}
          nextSortOrder={subgroups.length}
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
