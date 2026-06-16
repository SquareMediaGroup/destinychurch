"use client";

import { useState } from "react";
import { API, type TrainingCategory } from "@/lib/training";
import {
  Modal,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
} from "@/components/administration/hr/HrUI";

export function CategoryModal({
  category,
  onClose,
  onSaved,
  onError,
}: {
  category: TrainingCategory | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    description: category?.description ?? "",
    icon: category?.icon ?? "",
    is_published: category?.is_published ?? true,
    sort_order: category?.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      onError("A category name is required.");
      return;
    }
    setSaving(true);
    const url = category
      ? `${API}/categories/${category.id}`
      : `${API}/categories`;
    const method = category ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      onError(data.error || "Something went wrong.");
      return;
    }
    onSaved();
  }

  return (
    <Modal title={category ? "Edit category" : "New category"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Production"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Display order</label>
            <input
              type="number"
              className={inputClass}
              value={form.sort_order}
              onChange={(e) => set("sort_order", Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelClass}>Icon (optional)</label>
            <input
              className={inputClass}
              value={form.icon}
              onChange={(e) => set("icon", e.target.value)}
              placeholder="e.g. graphic_eq"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={inputClass}
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="One line shown under the category heading."
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#f5f7fa] px-4 py-3">
          <div>
            <p className="text-sm font-bold text-destiny-grey">Published</p>
            <p className="text-xs text-destiny-grey/45">
              Visible on the public /training page.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.is_published}
            onClick={() => set("is_published", !form.is_published)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              form.is_published ? "bg-destiny-green" : "bg-black/15"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                form.is_published ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={primaryBtn} disabled={saving}>
            {saving ? "Saving…" : category ? "Save changes" : "Create category"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
