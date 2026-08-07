"use client";

import { useEffect, useRef, useState } from "react";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { API, type Post } from "@/lib/posts";
import { slugify } from "@/lib/jobs";
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
import { BlockPalette } from "@/components/admin/blocks/BlockPalette";
import { BlockInspector } from "@/components/admin/blocks/BlockInspector";
import { BlockTools } from "@/components/admin/blocks/BlockTools";

// Desktop gets a full-screen, document-style editor; mobile keeps the popup.
// See lib/useIsDesktop for why this must be read synchronously.

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

/**
 * A collapsible desktop sidebar. Collapsed it becomes a thin vertical rail so
 * the way back is always visible — a fully hidden panel with no affordance is
 * how people conclude a feature has disappeared.
 */
function SidePanel({
  side,
  open,
  onToggle,
  label,
  icon,
  children,
}: {
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  const border = side === "left" ? "border-r" : "border-l";

  if (!open) {
    return (
      <div className={`hidden w-11 shrink-0 ${border} border-black/8 bg-white lg:block`}>
        <button
          type="button"
          onClick={onToggle}
          title={`Show ${label}`}
          aria-label={`Show ${label}`}
          className="flex h-full w-full flex-col items-center gap-2 pt-3 text-destiny-grey/45 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
        >
          <span className="material-symbols-rounded text-[19px]">{icon}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider [writing-mode:vertical-rl]">
            {label}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`hidden shrink-0 ${border} border-black/8 bg-white lg:flex lg:flex-col ${
        side === "left" ? "w-60" : "w-80"
      }`}
    >
      <div className="min-h-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-center gap-1 border-t border-black/8 py-2 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/35 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
      >
        <span className="material-symbols-rounded text-[15px]">
          {side === "left" ? "chevron_left" : "chevron_right"}
        </span>
        Hide
      </button>
    </div>
  );
}

type SlugState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; slug: string }
  | { status: "unavailable"; reason: string };

// Live availability check against the API, debounced.
function useSlugCheck(slug: string, excludeId?: string): SlugState {
  const [state, setState] = useState<SlugState>({ status: "idle" });

  useEffect(() => {
    // All state transitions live inside the debounced callback so the effect
    // body never sets state synchronously (avoids cascading renders).
    const handle = setTimeout(async () => {
      if (!slug.trim()) {
        setState({ status: "idle" });
        return;
      }
      setState({ status: "checking" });
      try {
        const params = new URLSearchParams({ slug });
        if (excludeId) params.set("excludeId", excludeId);
        const res = await fetch(`${API}/check-slug?${params.toString()}`);
        const data = await res.json();
        if (data.available) {
          setState({ status: "available", slug: data.slug });
        } else {
          setState({ status: "unavailable", reason: data.reason });
        }
      } catch {
        setState({ status: "idle" });
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [slug, excludeId]);

  return state;
}

function SlugHint({ state }: { state: SlugState }) {
  if (state.status === "checking") {
    return <span className="text-destiny-grey/40">Checking availability…</span>;
  }
  if (state.status === "available") {
    return (
      <span className="text-destiny-green">
        Available — your page will live at /{state.slug}
      </span>
    );
  }
  if (state.status === "unavailable") {
    return <span className="text-destiny-red">{state.reason}</span>;
  }
  return null;
}

export function PostEditor({
  post,
  onClose,
  onSaved,
  onError,
}: {
  post: Post | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const isDesktop = useIsDesktop();
  // The editor instance, published by RichTextEditor via onEditor, so the
  // Blocks sidebar and the inspector can drive it.
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [form, setForm] = useState({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    body: post?.body ?? "",
    is_published: post?.is_published ?? false,
  });
  const [saving, setSaving] = useState(false);
  // Once the admin edits the slug by hand, stop auto-deriving it from the title.
  const slugTouched = useRef(Boolean(post));

  const slugState = useSlugCheck(form.slug, post?.id);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: slugTouched.current ? f.slug : slugify(title),
    }));
  }

  function onSlugChange(value: string) {
    slugTouched.current = true;
    set("slug", slugify(value));
  }

  // Full-screen layout manages its own Escape-to-close + scroll lock.
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
    if (!form.slug.trim()) {
      onError("A URL slug is required.");
      return;
    }
    if (slugState.status === "unavailable") {
      onError(slugState.reason);
      return;
    }
    setSaving(true);

    const url = post ? `${API}/${post.id}` : API;
    const method = post ? "PATCH" : "POST";
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

  const editor = (
    <RichTextEditor
      value={form.body}
      onChange={(html) => set("body", html)}
      placeholder="Write the page content — use the toolbar for text, and the Blocks panel for FAQs, callouts and cards."
      advanced
      fill={isDesktop}
      enableYouTube
      enableHtmlEmbed
      enableImages
      enableChurchSuite
      blocks={BLOCK_LIST}
      onEditor={setEditorInstance}
    />
  );

  // ── Desktop: full-screen document editor ──────────────────────────────
  if (isDesktop) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
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
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Page title"
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
          {/* Settings row: slug + live availability */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-black/5 bg-[#f9fafb] px-5 py-2.5">
            <span className="text-sm font-bold text-destiny-grey/45">/</span>
            <input
              value={form.slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="page-url-slug"
              className="w-64 shrink-0 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15"
            />
            <span className="text-xs font-medium">
              <SlugHint state={slugState} />
            </span>
          </div>
        </div>

        {/*
          Blocks sidebar | canvas | settings sidebar.

          The sidebars sit outside the editor's bordered card, on the grey
          canvas, so the hierarchy reads page chrome → blocks → document →
          settings. Blocks deliberately do NOT appear in the editor toolbar:
          that toolbar formats the current text selection, and mixing page
          structure into it makes both harder to find.
        */}
        <div className="flex min-h-0 flex-1 bg-[#f5f7fa]">
          <SidePanel side="left" open={paletteOpen} onToggle={() => setPaletteOpen((v) => !v)} label="Blocks" icon="widgets">
            <BlockPalette editor={editorInstance} />
          </SidePanel>

          <div className="min-w-0 flex-1 overflow-hidden p-4 lg:p-6">
            <div className="mx-auto h-full max-w-3xl">{editor}</div>
          </div>

          <SidePanel side="right" open={inspectorOpen} onToggle={() => setInspectorOpen((v) => !v)} label="Settings" icon="tune">
            <BlockInspector editor={editorInstance} />
          </SidePanel>
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
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. Easter 2026"
          />
        </div>

        <div>
          <label className={labelClass}>URL slug</label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-destiny-grey/40">/</span>
            <input
              className={inputClass}
              required
              value={form.slug}
              onChange={(e) => onSlugChange(e.target.value)}
              placeholder="easter-2026"
            />
          </div>
          <p className="mt-1.5 text-xs font-medium">
            <SlugHint state={slugState} />
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className={labelClass + " mb-0"}>Content</label>
            {/* Same separation as desktop: blocks are reached from outside the
                editor, never from its formatting toolbar. */}
            <BlockTools editor={editorInstance} />
          </div>
          {editor}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#f5f7fa] px-4 py-3">
          <div>
            <p className="text-sm font-bold text-destiny-grey">Published</p>
            <p className="text-xs text-destiny-grey/45">
              When on, the page is live at its URL.
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
