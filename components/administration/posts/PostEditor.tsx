"use client";

import { useEffect, useRef, useState } from "react";
import { API, type Post } from "@/lib/posts";
import { slugify } from "@/lib/jobs";
import {
  Modal,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
} from "@/components/administration/hr/HrUI";
import RichTextEditor from "@/components/administration/RichTextEditor";

// Desktop gets a full-screen, document-style editor; mobile keeps the popup.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

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
      placeholder="Write the page content — use the toolbar to add headings, images, videos, ChurchSuite forms and embeds."
      advanced
      fill={isDesktop}
      enableYouTube
      enableHtmlEmbed
      enableImages
      enableChurchSuite
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

        <div className="flex-1 overflow-hidden bg-[#f5f7fa] p-4 lg:p-6">
          <div className="mx-auto h-full max-w-3xl">{editor}</div>
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
          <label className={labelClass}>Content</label>
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
