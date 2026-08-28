"use client";

import { useEffect, useState } from "react";
import { API, type TrainingPost, type TrainingFolder } from "@/lib/training";
import {
  Modal,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
} from "@/components/admin/AdminUI";
import RichTextEditor from "@/components/admin/RichTextEditor";
import type { Editor } from "@tiptap/react";
import { BLOCK_LIST } from "@/components/blocks/registry";
import { BlockTools } from "@/components/admin/blocks/BlockTools";
import { useIsDesktop } from "@/lib/useIsDesktop";

// Desktop gets a full-screen, document-style editor; mobile keeps the popup.
// Shared with the post editor. See lib/useIsDesktop for why this must be read
// synchronously rather than set from an effect.

function PublishToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        value ? "bg-destiny-green" : "bg-black/15"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
          value ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export function PostEditor({
  post,
  folders = [],
  subgroupId,
  nextSortOrder = 0,
  onClose,
  onSaved,
  onError,
}: {
  post: TrainingPost | null;
  folders?: TrainingFolder[];
  subgroupId: string;
  nextSortOrder?: number;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const isDesktop = useIsDesktop();
  const [form, setForm] = useState({
    title: post?.title ?? "",
    folder_id: post?.folder_id ?? "",
    summary: post?.summary ?? "",
    body: post?.body ?? "",
    min_read_minutes: (post?.min_read_seconds ?? 0) / 60,
    is_published: post?.is_published ?? false,
    sort_order: post?.sort_order ?? nextSortOrder,
  });
  const [saving, setSaving] = useState(false);
  // Published by RichTextEditor so BlockTools can drive the same instance.
  const [bodyEditor, setBodyEditor] = useState<Editor | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Full-screen layout manages its own Escape-to-close + scroll lock (the
  // mobile branch delegates this to <Modal>).
  useEffect(() => {
    if (!isDesktop) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isDesktop, onClose]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.title.trim()) {
      onError("A post title is required.");
      return;
    }
    setSaving(true);

    const payload: Record<string, unknown> = { ...form };
    payload.min_read_seconds = Math.round(form.min_read_minutes * 60);
    delete payload.min_read_minutes;

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

  // ── Desktop: full-screen document editor ──────────────────────────────
  if (isDesktop) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-destiny-grey-900">
        {/* Top bar */}
        <div className="border-b border-black/10">
          <div className="flex items-center gap-3 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
            >
              <span className="material-symbols-rounded text-xl">close</span>
            </button>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Post title"
              className="flex-1 bg-transparent text-lg font-black text-destiny-grey outline-none placeholder:font-bold placeholder:text-destiny-grey/30"
            />
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-destiny-grey/45">
                Published
              </span>
              <PublishToggle
                value={form.is_published}
                onChange={(v) => set("is_published", v)}
              />
            </div>
            <button type="button" className={ghostBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={primaryBtn}
              disabled={saving}
              onClick={() => submit()}
            >
              {saving ? "Saving…" : post ? "Save changes" : "Create post"}
            </button>
          </div>
          {/* Settings row */}
          <div className="flex items-center gap-3 border-t border-black/5 bg-[#f9fafb] px-5 py-2.5">
            <select
              className="shrink-0 rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-3 py-1.5 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15"
              value={form.folder_id || ""}
              onChange={(e) => set("folder_id", e.target.value)}
            >
              <option value="">Ungrouped</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              value={form.min_read_minutes || ""}
              onChange={(e) => set("min_read_minutes", parseInt(e.target.value) || 0)}
              placeholder="Min read time (mins)"
              className="w-40 shrink-0 rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-3 py-1.5 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15"
              title="Minimum read time in minutes"
            />
            <input
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
              placeholder="One-line summary shown in the posts list…"
              className="flex-1 bg-transparent text-sm text-destiny-grey outline-none placeholder:text-destiny-grey/35"
            />
          </div>
        </div>

        {/* Editor body */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f7fa] p-4 lg:p-6">
          <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
            {/* Blocks live outside the formatting toolbar — see BlockTools. */}
            <div className="mb-2 flex justify-end">
              <BlockTools editor={bodyEditor} />
            </div>
            <RichTextEditor
              value={form.body}
              onChange={(html) => set("body", html)}
              placeholder="Write the training content — use the toolbar for text, and Blocks for FAQs, callouts and cards."
              advanced
              fill
              enableYouTube
              enableHtmlEmbed
              blocks={BLOCK_LIST}
              onEditor={setBodyEditor}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile: popup ─────────────────────────────────────────────────────
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
          <label className={labelClass}>Folder (Optional)</label>
          <select
            className={inputClass}
            value={form.folder_id || ""}
            onChange={(e) => set("folder_id", e.target.value)}
          >
            <option value="">Ungrouped</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
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
          <label className={labelClass}>Min read time (minutes)</label>
          <input
            type="number"
            min="0"
            className={inputClass}
            value={form.min_read_minutes || ""}
            onChange={(e) => set("min_read_minutes", parseInt(e.target.value) || 0)}
            placeholder="e.g. 5"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={`${labelClass} mb-0`}>Content</label>
            <BlockTools editor={bodyEditor} />
          </div>
          <RichTextEditor
            value={form.body}
            onChange={(html) => set("body", html)}
            placeholder="Write the training content — use the toolbar for text, and Blocks for FAQs, callouts and cards."
            advanced
            enableYouTube
            enableHtmlEmbed
            blocks={BLOCK_LIST}
            onEditor={setBodyEditor}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#f5f7fa] px-4 py-3">
          <div>
            <p className="text-sm font-bold text-destiny-grey">Published</p>
            <p className="text-xs text-destiny-grey/45">
              Visible to people who have unlocked this group.
            </p>
          </div>
          <PublishToggle
            value={form.is_published}
            onChange={(v) => set("is_published", v)}
          />
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
