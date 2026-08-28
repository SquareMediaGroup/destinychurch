"use client";

import { useEffect, useState } from "react";
import {
  API,
  CHECKLIST_KIND_LABELS,
  type ChecklistItem,
  type ChecklistKind,
  type ChecklistTemplate,
} from "@/lib/hr";
import { Modal, inputClass, labelClass, primaryBtn, ghostBtn } from "@/components/admin/AdminUI";

/**
 * Onboarding/offboarding checklist for one staff member, embedded inline on
 * their profile page — a checklist reads naturally as a list, not behind a
 * modal. Offers "start from template" when nothing has been started yet.
 */
export function ChecklistSection({
  staffId,
  kind,
  items,
  onChange,
}: {
  staffId: string;
  kind: ChecklistKind;
  items: ChecklistItem[];
  onChange: () => void;
}) {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [starting, setStarting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (items.length > 0) return; // nothing to start from once it's begun
    fetch(`${API}/checklist-templates`)
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data.filter((t) => t.kind === kind) : []));
  }, [items.length, kind]);

  async function startFrom(templateId?: string) {
    setStarting(true);
    setError("");
    const res = await fetch(`${API}/checklists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: staffId, kind, template_id: templateId }),
    });
    setStarting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not start the checklist.");
      return;
    }
    onChange();
  }

  async function toggle(item: ChecklistItem) {
    const res = await fetch(`${API}/checklists/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_done: !item.is_done }),
    });
    if (res.ok) onChange();
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const res = await fetch(`${API}/checklists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staff_id: staffId, kind, items: [{ label: newLabel.trim() }] }),
    });
    if (res.ok) {
      setNewLabel("");
      setAdding(false);
      onChange();
    }
  }

  async function remove(id: string) {
    const res = await fetch(`${API}/checklists/${id}`, { method: "DELETE" });
    if (res.ok) onChange();
  }

  const done = items.filter((i) => i.is_done).length;

  return (
    <section className="rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-black text-destiny-grey">{CHECKLIST_KIND_LABELS[kind]}</h2>
          {items.length > 0 && (
            <p className="text-xs text-destiny-grey/45">
              {done} / {items.length} done
            </p>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={() => setAdding((a) => !a)}
            className="inline-flex items-center gap-1 text-xs font-bold text-destiny-orange transition hover:brightness-110"
          >
            <span className="material-symbols-rounded text-base">add</span>
            Item
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-xs font-bold text-destiny-red">{error}</p>}

      {items.length === 0 ? (
        <div className="flex flex-col gap-2">
          <p className="py-2 text-sm text-destiny-grey/40">Not started.</p>
          {templates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  disabled={starting}
                  onClick={() => startFrom(t.id)}
                  className={ghostBtn}
                >
                  Start &quot;{t.name}&quot;
                </button>
              ))}
            </div>
          )}
          <button
            disabled={starting}
            onClick={() => setAdding(true)}
            className="self-start text-xs font-bold text-destiny-orange transition hover:brightness-110"
          >
            Start blank
          </button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2.5">
              <input
                type="checkbox"
                checked={item.is_done}
                onChange={() => toggle(item)}
                className="h-4 w-4 shrink-0 rounded accent-destiny-orange"
              />
              <span
                className={`flex-1 text-sm ${
                  item.is_done ? "text-destiny-grey/40 line-through" : "text-destiny-grey"
                }`}
              >
                {item.label}
              </span>
              <button
                onClick={() => remove(item.id)}
                className="text-destiny-grey/30 transition hover:text-destiny-red"
                aria-label={`Remove ${item.label}`}
              >
                <span className="material-symbols-rounded text-base">close</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={addItem} className="mt-3 flex gap-2">
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New item"
            className={`${inputClass} flex-1`}
          />
          <button type="submit" className={primaryBtn}>
            Add
          </button>
        </form>
      )}
    </section>
  );
}

// ── Template management ─────────────────────────────────────────────────

export function ChecklistTemplateModal({
  template,
  onClose,
  onSaved,
  onError,
}: {
  template: ChecklistTemplate | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [kind, setKind] = useState<ChecklistKind>(template?.kind ?? "onboarding");
  const [items, setItems] = useState<string[]>(
    template?.items?.map((i) => i.label) ?? [""],
  );
  const [saving, setSaving] = useState(false);

  function updateItem(i: number, value: string) {
    setItems((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: name.trim(),
      kind,
      items: items.filter((v) => v.trim()).map((label) => ({ label: label.trim() })),
    };
    const res = template
      ? await fetch(`${API}/checklist-templates/${template.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      : await fetch(`${API}/checklist-templates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      const d = await res.json().catch(() => ({}));
      onError(d.error || "Something went wrong.");
    }
  }

  return (
    <Modal title={template ? "Edit template" : "New template"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="New starter"
          />
        </div>
        <div>
          <label className={labelClass}>Kind</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ChecklistKind)}
            className={inputClass}
          >
            {(Object.keys(CHECKLIST_KIND_LABELS) as ChecklistKind[]).map((k) => (
              <option key={k} value={k}>
                {CHECKLIST_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Items</label>
          <div className="flex flex-col gap-2">
            {items.map((value, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={value}
                  onChange={(e) => updateItem(i, e.target.value)}
                  className={`${inputClass} flex-1`}
                  placeholder={`Item ${i + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-destiny-grey/40 transition hover:text-destiny-red"
                  aria-label="Remove item"
                >
                  <span className="material-symbols-rounded text-lg">close</span>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, ""])}
            className="mt-2 text-xs font-bold text-destiny-orange transition hover:brightness-110"
          >
            + Add item
          </button>
        </div>
        <div className="mt-2 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
