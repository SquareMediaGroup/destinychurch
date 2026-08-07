"use client";

import { useState } from "react";
import {
  API,
  EMPLOYMENT_LABELS,
  KIND_LABELS,
  type Job,
  type JobEmploymentType,
  type JobKind,
} from "@/lib/jobs";
import {
  Modal,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
} from "@/components/admin/hr/HrUI";
import RichTextEditor from "@/components/admin/RichTextEditor";
import type { Editor } from "@tiptap/react";
import { BLOCK_LIST } from "@/components/blocks/registry";
import { BlockTools } from "@/components/admin/blocks/BlockTools";

export function JobModal({
  job,
  onClose,
  onSaved,
  onError,
}: {
  job: Job | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    title: job?.title ?? "",
    kind: (job?.kind ?? "job") as JobKind,
    department: job?.department ?? "",
    employment_type: (job?.employment_type ?? "full_time") as JobEmploymentType,
    location: job?.location ?? "",
    hours: job?.hours ?? "",
    salary: job?.salary ?? "",
    closing_date: job?.closing_date ?? "",
    summary: job?.summary ?? "",
    description: job?.description ?? "",
    is_published: job?.is_published ?? false,
    sort_order: job?.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);
  // Published by RichTextEditor so BlockTools can drive the same instance.
  const [bodyEditor, setBodyEditor] = useState<Editor | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      onError("A job title is required.");
      return;
    }
    setSaving(true);
    const url = job ? `${API}/jobs/${job.id}` : `${API}/jobs`;
    const method = job ? "PATCH" : "POST";
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
    <Modal title={job ? "Edit role" : "New role"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Worship Pastor"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Listing type</label>
            <select
              className={inputClass}
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as JobKind)}
            >
              {Object.entries(KIND_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Employment</label>
            <select
              className={inputClass}
              value={form.employment_type}
              onChange={(e) =>
                set("employment_type", e.target.value as JobEmploymentType)
              }
            >
              {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Department</label>
            <input
              className={inputClass}
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              placeholder="e.g. Worship"
            />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <input
              className={inputClass}
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Stockton-on-Tees"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Hours</label>
            <input
              className={inputClass}
              value={form.hours}
              onChange={(e) => set("hours", e.target.value)}
              placeholder="e.g. 37.5 hrs/week"
            />
          </div>
          <div>
            <label className={labelClass}>Salary</label>
            <input
              className={inputClass}
              value={form.salary}
              onChange={(e) => set("salary", e.target.value)}
              placeholder="e.g. £24,000–£28,000"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Closing date</label>
          <input
            type="date"
            className={inputClass}
            value={form.closing_date ?? ""}
            onChange={(e) => set("closing_date", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass}>Summary</label>
          <textarea
            className={inputClass}
            rows={2}
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="One-line teaser shown on the listing card."
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={`${labelClass} mb-0`}>Description</label>
            <BlockTools editor={bodyEditor} />
          </div>
          <RichTextEditor
            value={form.description}
            onChange={(html) => set("description", html)}
            placeholder="Describe the role — use the toolbar for text, and Blocks for FAQs and callouts."
            enableHtmlEmbed
            blocks={BLOCK_LIST}
            onEditor={setBodyEditor}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#f5f7fa] px-4 py-3">
          <div>
            <p className="text-sm font-bold text-destiny-grey">Published</p>
            <p className="text-xs text-destiny-grey/45">
              Visible on the public /jobs page.
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
            {saving ? "Saving…" : job ? "Save changes" : "Create role"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
