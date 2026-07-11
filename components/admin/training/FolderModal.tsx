import { useState } from "react";
import type { TrainingFolder } from "@/lib/training";
import { API } from "@/lib/training";
import {
  Modal,
  primaryBtn,
  ghostBtn,
  inputClass,
  labelClass,
} from "@/components/admin/hr/HrUI";

export function FolderModal({
  folder,
  subgroupId,
  nextSortOrder,
  onClose,
  onSaved,
  onError,
}: {
  folder: TrainingFolder | null;
  subgroupId: string;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: folder?.name ?? "",
    sort_order: folder?.sort_order ?? nextSortOrder,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const method = folder ? "PATCH" : "POST";
    const endpoint = folder ? `${API}/folders/${folder.id}` : `${API}/folders`;
    const payload = folder ? form : { ...form, subgroup_id: subgroupId };

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save the folder.");
      }
      onSaved();
    } catch (err: any) {
      onError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={folder ? "Edit Folder" : "New Folder"} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Folder Name</label>
          <input
            className={inputClass}
            required
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Core Values"
          />
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? "Saving…" : "Save Folder"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
