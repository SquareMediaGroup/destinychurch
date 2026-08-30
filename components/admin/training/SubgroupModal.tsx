"use client";

import { useState } from "react";
import { API, type TrainingSubgroup } from "@/lib/training";
import {
  Modal,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
  Badge,
} from "@/components/admin/AdminUI";

export function SubgroupModal({
  subgroup,
  categoryId,
  nextSortOrder = 0,
  onClose,
  onSaved,
  onError,
}: {
  subgroup: TrainingSubgroup | null;
  categoryId: string;
  nextSortOrder?: number;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const hasPassword = subgroup?.has_password ?? false;
  const [form, setForm] = useState({
    name: subgroup?.name ?? "",
    description: subgroup?.description ?? "",
    is_published: subgroup?.is_published ?? true,
    sort_order: subgroup?.sort_order ?? nextSortOrder,
  });
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      onError("A sub-group name is required.");
      return;
    }
    setSaving(true);

    const payload: Record<string, unknown> = { ...form };
    if (!subgroup) payload.category_id = categoryId;
    if (removePassword) {
      payload.clear_password = true;
    } else if (password.length > 0) {
      payload.password = password;
    }

    const url = subgroup
      ? `${API}/subgroups/${subgroup.id}`
      : `${API}/subgroups`;
    const method = subgroup ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    <Modal title={subgroup ? "Edit sub-group" : "New sub-group"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            className={inputClass}
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Sound"
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea
            className={inputClass}
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="One line shown on the sub-group card."
          />
        </div>

        {/* Password */}
        <div className="rounded-xl border border-black/10 bg-[#f9fafb] p-4">
          <div className="mb-1.5 flex items-center justify-between">
            <label className={`${labelClass} mb-0`}>
              {hasPassword ? "Change password" : "Password"}
            </label>
            {hasPassword && <Badge tone="green">Password set</Badge>}
          </div>
          <input
            type="password"
            className={inputClass}
            autoComplete="new-password"
            value={password}
            disabled={removePassword}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              hasPassword
                ? "Leave blank to keep current password"
                : "Set a password to protect this group"
            }
          />
          <p className="mt-1.5 text-xs text-destiny-grey/45 dark:text-white/45">
            Visitors must enter this to read the group&apos;s posts. Stored
            securely (hashed) — it can&apos;t be read back.
          </p>
          {hasPassword && (
            <label className="mt-2 flex items-center gap-2 text-xs font-bold text-destiny-grey/60 dark:text-white/60">
              <input
                type="checkbox"
                checked={removePassword}
                onChange={(e) => setRemovePassword(e.target.checked)}
              />
              Remove password (make this group open to everyone)
            </label>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#f5f7fa] px-4 py-3">
          <div>
            <p className="text-sm font-bold text-destiny-grey dark:text-white">Published</p>
            <p className="text-xs text-destiny-grey/45 dark:text-white/45">
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
            {saving ? "Saving…" : subgroup ? "Save changes" : "Create sub-group"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
