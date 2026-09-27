"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { useScrollLock } from "@/lib/useScrollLock";
import { API, type Post, type PostFields } from "@/lib/posts";
import type { PostTemplate } from "@/lib/postTemplates";
import { useDialog } from "@/components/DialogProvider";
import { useSelectedBlock } from "@/components/admin/blocks/useSelectedBlock";
import { PageSettings } from "./PageSettings";
import { slugify } from "@/lib/jobs";
import { primaryBtn, ghostBtn } from "@/components/admin/AdminUI";
import { Sheet } from "@/components/admin/Sheet";
import RichTextEditor from "@/components/admin/RichTextEditor";
import type { Editor } from "@tiptap/react";
import { BLOCK_LIST } from "@/components/blocks/registry";
import { BlockPalette } from "@/components/admin/blocks/BlockPalette";
import { BlockInspector } from "@/components/admin/blocks/BlockInspector";
import { BlockTools } from "@/components/admin/blocks/BlockTools";

// Both breakpoints are full-screen document editors; what differs is where the
// panels live. Desktop has room for permanent Blocks and Settings sidebars,
// mobile reaches the same panels through bottom sheets.
// See lib/useIsDesktop for why the breakpoint must be read synchronously.

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
      <div className={`hidden w-11 shrink-0 ${border} border-black/8 bg-white dark:border-white/8 dark:bg-destiny-grey-800 lg:block`}>
        <button
          type="button"
          onClick={onToggle}
          title={`Show ${label}`}
          aria-label={`Show ${label}`}
          className="flex h-full w-full flex-col items-center gap-2 pt-3 text-destiny-grey/45 dark:text-white/45 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:hover:text-white"
        >
          <span className="material-symbols-rounded text-[19px]" aria-hidden="true">{icon}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider [writing-mode:vertical-rl]">
            {label}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`hidden shrink-0 ${border} border-black/8 bg-white dark:border-white/8 dark:bg-destiny-grey-800 lg:flex lg:flex-col ${
        side === "left" ? "w-60" : "w-80"
      }`}
    >
      <div className="min-h-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-center gap-1 border-t border-black/8 py-2 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/35 dark:text-white/35 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:hover:text-white"
      >
        <span className="material-symbols-rounded text-[15px]" aria-hidden="true">
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
    return <span className="text-destiny-grey/40 dark:text-white/40">Checking availability…</span>;
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

function SlugField({
  id,
  value,
  onChange,
  state,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  state: SlugState;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45"
      >
        Page URL
      </label>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-bold text-destiny-grey/40 dark:text-white/40">/</span>
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="easter-2026"
          // 16px on phones: iOS zooms the page on any smaller focused input.
          className="w-full rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-3.5 py-2.5 text-base text-destiny-grey dark:text-white outline-none transition placeholder:text-destiny-grey/30 dark:placeholder:text-white/30 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15 lg:text-sm"
        />
      </div>
      <p className="mt-1.5 text-xs font-medium">
        <SlugHint state={state} />
      </p>
    </div>
  );
}

function initialFields(post: Post | null, template?: PostTemplate): PostFields {
  const base: PostFields = {
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    body: post?.body ?? "",
    is_published: post?.is_published ?? false,
    hero_style: post?.hero_style ?? "plain",
    hero_image_url: post?.hero_image_url ?? null,
    subtitle: post?.subtitle ?? null,
    description: post?.description ?? null,
    og_image_url: post?.og_image_url ?? null,
    show_rails: post?.show_rails ?? true,
  };
  return post ? base : { ...base, ...template?.fields };
}

export function PostEditor({
  post,
  template,
  onClose,
  onSaved,
  onError,
}: {
  post: Post | null;
  /** New posts only: the starter layout picked from the template chooser. */
  template?: PostTemplate;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const { confirm } = useDialog();
  const isDesktop = useIsDesktop();
  // The editor instance, published by RichTextEditor via onEditor, so the
  // Blocks sidebar and the inspector can drive it.
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  // Mobile only: the slug + published sheet, the equivalent of the desktop
  // settings row that there is no width for on a phone.
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [form, setForm] = useState<PostFields>(() => initialFields(post, template));
  // What's on the server, to tell whether closing would lose anything. JSON
  // rather than a deep-equal helper: the form is small and flat.
  // A new post starts "clean" at its template, so closing an untouched one
  // doesn't ask.
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(initialFields(post, template)),
  );
  const dirty = JSON.stringify(form) !== savedSnapshot;
  // Set once a new post has been saved (by Preview) so later saves PATCH it.
  const [postId, setPostId] = useState<string | undefined>(post?.id);
  const [saving, setSaving] = useState(false);
  // Once the admin edits the slug by hand, stop auto-deriving it from the title.
  const slugTouched = useRef(Boolean(post));

  const slugState = useSlugCheck(form.slug, postId);

  // Right sidebar: Page settings or the selected block's settings. Derived
  // rather than synced — selecting a block shows Block, deselecting shows
  // Page, and a manual tab choice holds until the selection changes.
  const selected = useSelectedBlock(editorInstance);
  const selectionKey = selected ? `${selected.pos}|${selected.blockName}` : "";
  const [tabChoice, setTabChoice] = useState<{ key: string; tab: "page" | "block" } | null>(null);
  const rightTab =
    tabChoice && tabChoice.key === selectionKey ? tabChoice.tab : selected ? "block" : "page";

  const set = useCallback(<K extends keyof PostFields>(key: K, value: PostFields[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

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

  // Full-screen layout manages its own Escape-to-close + scroll lock. Both
  // breakpoints are full-screen now, so this is unconditional.
  useScrollLock(true);

  async function requestClose() {
    if (
      dirty &&
      !(await confirm({
        title: "Discard changes?",
        message: "You have unsaved changes to this page. Close without saving?",
        confirmLabel: "Discard",
        tone: "danger",
      }))
    ) {
      return;
    }
    onClose();
  }

  /** Saves the post. Returns its id, or null if validation or the request failed. */
  async function save({ close }: { close: boolean }): Promise<string | null> {
    if (saving) return null;
    if (!form.title.trim()) {
      onError("A post title is required.");
      return null;
    }
    if (!form.slug.trim()) {
      onError("A URL slug is required.");
      return null;
    }
    if (slugState.status === "unavailable") {
      onError(slugState.reason);
      return null;
    }
    if (form.hero_style === "image" && !form.hero_image_url) {
      onError("The Image header needs an image — add one in Page settings, or pick another header.");
      return null;
    }
    setSaving(true);

    const url = postId ? `${API}/${postId}` : API;
    const method = postId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      onError(data.error || "Something went wrong.");
      return null;
    }
    setPostId(data.id);
    setSavedSnapshot(JSON.stringify(form));
    if (close) onSaved();
    return data.id as string;
  }

  /**
   * Save, then open a signed preview. The tab is opened before the awaits so
   * it counts as a direct response to the click — browsers block popups
   * opened after an async gap.
   */
  async function preview() {
    const tab = window.open("about:blank", "_blank");
    const id = await save({ close: false });
    if (!id) {
      tab?.close();
      return;
    }
    const res = await fetch(`${API}/${id}/preview`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      tab?.close();
      onError(data.error || "Couldn't create a preview link.");
      return;
    }
    if (tab) tab.location.href = data.url;
    else window.open(data.url, "_blank");
  }

  // Latest handlers for the document-level listeners, so they don't need
  // re-binding on every keystroke.
  const handlers = useRef({ requestClose, save: () => save({ close: true }) });
  useEffect(() => {
    handlers.current = { requestClose, save: () => save({ close: true }) };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) handlers.current.requestClose();
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlers.current.save();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A tab close or reload would lose edits too.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const slugField = (id: string) => (
    <SlugField id={id} value={form.slug} onChange={onSlugChange} state={slugState} />
  );

  const editor = (
    <RichTextEditor
      value={form.body ?? ""}
      onChange={(html) => set("body", html)}
      placeholder="Write the page content — use the toolbar for text, and the Blocks panel for FAQs, callouts and cards."
      advanced
      fill
      enableYouTube
      enableHtmlEmbed
      enableImages
      blocks={BLOCK_LIST}
      onEditor={setEditorInstance}
    />
  );

  // ── Desktop: full-screen document editor ──────────────────────────────
  if (isDesktop) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-destiny-grey-900">
        <div className="border-b border-black/10">
          <div className="flex items-center gap-3 px-5 py-3">
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-destiny-grey/50 dark:text-white/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:hover:text-white"
            >
              <span className="material-symbols-rounded text-xl" aria-hidden="true">close</span>
            </button>
            <input
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Page title"
              className="flex-1 bg-transparent text-lg font-black text-destiny-grey dark:text-white outline-none placeholder:font-bold placeholder:text-destiny-grey/30 dark:placeholder:text-white/30"
            />
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
                Published
              </span>
              <PublishToggle
                value={form.is_published}
                onChange={(v) => set("is_published", v)}
              />
            </div>
            {dirty && (
              <span className="text-xs font-medium text-destiny-grey/45 dark:text-white/45">
                Unsaved changes
              </span>
            )}
            <button type="button" className={ghostBtn} disabled={saving} onClick={preview}>
              Preview
            </button>
            <button
              type="button"
              className={primaryBtn}
              disabled={saving}
              onClick={() => save({ close: true })}
              title="Save (Ctrl+S)"
            >
              {saving ? "Saving…" : postId ? "Save changes" : "Create post"}
            </button>
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
            <div className="flex h-full flex-col">
              <div role="tablist" aria-label="Settings" className="flex shrink-0 gap-1 border-b border-black/8 p-2 dark:border-white/8">
                {(["page", "block"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={rightTab === tab}
                    onClick={() => setTabChoice({ key: selectionKey, tab })}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                      rightTab === tab
                        ? "bg-[#f5f7fa] text-destiny-grey dark:bg-white/10 dark:text-white"
                        : "text-destiny-grey/45 hover:text-destiny-grey dark:text-white/45 dark:hover:text-white"
                    }`}
                  >
                    {tab === "page" ? "Page" : "Block"}
                  </button>
                ))}
              </div>
              <div className="min-h-0 flex-1">
                {rightTab === "page" ? (
                  <div className="h-full overflow-y-auto p-4">
                    <PageSettings form={form} set={set} urlAndStatus={slugField("post-slug-desktop")} />
                  </div>
                ) : (
                  <BlockInspector editor={editorInstance} />
                )}
              </div>
            </div>
          </SidePanel>
        </div>
      </div>
    );
  }

  /*
    ── Mobile: full-screen document editor ─────────────────────────────────

    This used to be a popup: the whole form, including the editor, inside a
    scrolling modal, with the editor itself capped at 420px and scrolling
    separately inside that. Three nested scroll regions on a 700px-tall screen,
    of which the page content — the thing being written — got about a third.
    Adding a block then pushed it out of sight entirely.

    So mobile now matches desktop's shape rather than desktop's layout: the
    editor owns the screen, the title is edited in place in the header, and the
    two things the desktop settings row shows permanently (the slug and the
    published switch) move into a sheet behind one button. Every mobile CMS
    lands here for the same reason — on a phone the content is the screen, and
    everything else is one tap away.
  */
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-destiny-grey-900">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-black/10 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-destiny-grey/50 dark:text-white/50 transition active:bg-[#f5f7fa]"
        >
          <span className="material-symbols-rounded text-xl" aria-hidden="true">close</span>
        </button>
        <input
          value={form.title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-label="Title"
          placeholder="Page title"
          className="min-w-0 flex-1 bg-transparent text-base font-black text-destiny-grey dark:text-white outline-none placeholder:font-bold placeholder:text-destiny-grey/30 dark:placeholder:text-white/30"
        />
        <button
          type="button"
          className={`${primaryBtn} shrink-0 px-3.5`}
          disabled={saving}
          onClick={() => save({ close: true })}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-2 border-b border-black/5 bg-[#f9fafb] px-2 py-1.5">
        <button
          type="button"
          onClick={() => setPageSettingsOpen(true)}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2 text-left text-xs font-medium text-destiny-grey/55 dark:text-white/55 transition active:bg-black/5"
        >
          <span
            aria-hidden
            className="material-symbols-rounded shrink-0 text-[17px] text-destiny-grey/40 dark:text-white/40"
          >
            settings
          </span>
          <span className="truncate">/{form.slug || "page-url-slug"}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              form.is_published
                ? "bg-destiny-green/10 text-destiny-green"
                : "bg-black/5 text-destiny-grey/45 dark:text-white/45"
            }`}
          >
            {form.is_published ? "Live" : "Draft"}
          </span>
        </button>
        {/* Same separation as desktop: blocks are reached from outside the
            editor, never from its formatting toolbar. */}
        <BlockTools editor={editorInstance} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-[#f5f7fa] p-2">{editor}</div>

      {pageSettingsOpen && (
        <Sheet
          title="Page settings"
          detent="auto"
          onClose={() => setPageSettingsOpen(false)}
        >
          <div className="flex flex-col gap-5 px-4 py-4">
            {slugField("post-slug")}

            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f5f7fa] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-destiny-grey dark:text-white">Published</p>
                <p className="text-xs text-destiny-grey/45 dark:text-white/45">
                  When on, the page is live at its URL.
                </p>
              </div>
              <PublishToggle
                value={form.is_published}
                onChange={(v) => set("is_published", v)}
              />
            </div>

            <PageSettings form={form} set={set} />

            <button
              type="button"
              className={`${ghostBtn} w-full`}
              disabled={saving}
              onClick={() => {
                setPageSettingsOpen(false);
                preview();
              }}
            >
              Preview
            </button>
            <button
              type="button"
              className={`${ghostBtn} w-full`}
              onClick={() => setPageSettingsOpen(false)}
            >
              Done
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
