"use client";

import { useState } from "react";
import { API, type TrainingPost } from "@/lib/training";
import {
  Modal,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
} from "@/components/administration/hr/HrUI";
import RichTextEditor from "@/components/administration/RichTextEditor";

export function PostModal({
  post,
  subgroupId,
  onClose,
  onSaved,
  onError,
}: {
  post: TrainingPost | null;
  subgroupId: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    title: post?.title ?? "",
    summary: post?.summary ?? "",
    body: post?.body ?? "",
    is_published: post?.is_published ?? false,
    sort_order: post?.sort_order ?? 0,
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      onError("A post title is required.");
      return;
    }
    setSaving(true);

    const payload: Record<string, unknown> = { ...form };
    if (!post) payload.subgroup_id = subgroupId;

    const url = post ? `${API}/posts/${post.id}` : `${API}/posts`;
    const method = post ? "PATCH" : "POST";
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
    <Modal title={post ? "Edit post" : "New post"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Title</label>
          <input
            className={inputClass}
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Setting up the mixing desk"
          />
        </div>

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
          <label className={labelClass}>Summary</label>
          <textarea
            className={inputClass}
            rows={2}
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
            placeholder="One-line teaser shown in the posts list."
          />
        </div>

        <div>
          <label className={labelClass}>Content</label>
          <RichTextEditor
            value={form.body}
            onChange={(html) => set("body", html)}
            placeholder="Write the training content — use the toolbar to add headings, lists and YouTube videos."
            enableYouTube
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#f5f7fa] px-4 py-3">
          <div>
            <p className="text-sm font-bold text-destiny-grey">Published</p>
            <p className="text-xs text-destiny-grey/45">
              Visible to people who have unlocked this group.
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
            {saving ? "Saving…" : post ? "Save changes" : "Create post"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
