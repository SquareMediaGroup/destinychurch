"use client";

import { useEffect, useMemo, useRef, useState, use } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { EditClickMessage, EditUpdateMessage } from "@/components/admin/VisualEditOverlay";

interface EditableText {
  id: string;
  label: string;
  value: string;
  file: string;
  section: string;
  kind: "heading" | "body" | "cta" | "alt" | "href";
  context: string;
}

interface PageRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  source_type: "json" | "code";
  source_path: string | null;
  repo_commit: string | null;
  editable_texts: EditableText[];
  updated_at: string;
}

type Mode = "form" | "visual";

interface ActivePick {
  id: string;
  label: string;
  value: string;
  section: string;
  kind: EditableText["kind"];
}

export default function CodePageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [page, setPage] = useState<PageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("form");

  // Local edits keyed by editable text id
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<{
    runUrl?: string;
    editCount: number;
  } | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Visual mode state
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [activePick, setActivePick] = useState<ActivePick | null>(null);

  async function scanForTexts() {
    if (!page) return;
    setScanning(true);
    setScanError(null);
    try {
      const r = await fetch(`/api/admin/builder/code/${page.id}/extract-texts`, {
        method: "POST",
      });
      const json = (await r.json()) as Record<string, unknown>;
      if (!r.ok) {
        throw new Error((json.error as string) ?? `Scan failed (${r.status})`);
      }
      const refresh = await fetch(`/api/admin/builder/code/${page.id}`);
      const refreshData = (await refresh.json()) as { page: PageRow };
      setPage(refreshData.page);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/admin/builder/code/${id}`);
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? `Failed to load page (${r.status})`);
        }
        const data = (await r.json()) as { page: PageRow };
        if (!cancelled) setPage(data.page);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Listen for postMessage events from the visual edit iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "dc-edit-click") {
        const msg = e.data as EditClickMessage;
        // Pre-fill with existing draft if any
        setActivePick({
          id: msg.id,
          label: msg.label,
          value: msg.value,
          section: msg.section,
          kind: msg.kind,
        });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Grouped editable texts by section
  const grouped = useMemo(() => {
    if (!page) return [] as Array<{ section: string; items: EditableText[] }>;
    const map = new Map<string, EditableText[]>();
    for (const t of page.editable_texts) {
      if (!map.has(t.section)) map.set(t.section, []);
      map.get(t.section)!.push(t);
    }
    const order = (s: string) => (s.toLowerCase() === "metadata" ? 9999 : 0);
    return [...map.entries()]
      .sort(([a], [b]) => order(a) - order(b))
      .map(([section, items]) => ({ section, items }));
  }, [page]);

  const dirtyEdits = useMemo(() => {
    if (!page) return [];
    return page.editable_texts
      .filter((t) => drafts[t.id] !== undefined && drafts[t.id] !== t.value)
      .map((t) => ({ id: t.id, label: t.label, value: drafts[t.id] }));
  }, [page, drafts]);

  function setDraft(id: string, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: value }));
    // Sync value into iframe DOM
    const msg: EditUpdateMessage = { type: "dc-edit-update", id, value };
    iframeRef.current?.contentWindow?.postMessage(msg, "*");
  }

  function discardAll() {
    if (!confirm("Discard all unsaved edits?")) return;
    setDrafts({});
  }

  async function handleSave() {
    if (!page) return;
    if (dirtyEdits.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("Not authenticated. Please log in and try again.");

      const r = await fetch(`/api/admin/builder/code/${id}/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          edits: dirtyEdits.map((e) => ({ id: e.id, value: e.value })),
        }),
      });
      const json = (await r.json()) as Record<string, unknown>;
      if (!r.ok) {
        throw new Error((json.error as string) ?? `Failed to queue edits (${r.status})`);
      }
      setSubmitted({
        runUrl: json.runUrl as string | undefined,
        editCount: dirtyEdits.length,
      });
      setDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <div className="flex items-center gap-3 text-sm text-destiny-grey/60">
          <span className="material-symbols-rounded animate-spin text-lg">
            progress_activity
          </span>
          Loading page…
        </div>
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/admin/builder"
          className="text-xs font-bold text-destiny-grey/50 hover:text-destiny-orange"
        >
          Back to pages
        </Link>
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-bold text-red-900">Couldn&apos;t load this page</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!page) return null;

  const noTexts = page.editable_texts.length === 0;
  const iframeUrl = `/${page.slug}?__edit=1&__editId=${page.id}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      {mode === "visual" ? (
        /* ── Visual mode: slim floating toolbar ── */
        <div className="fixed top-3 right-4 z-40 flex items-center gap-2 rounded-2xl border border-black/10 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMode("form")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#f5f7fa] px-3 py-1.5 text-xs font-bold text-destiny-grey/70 transition hover:bg-black/5 hover:text-destiny-grey"
          >
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            Form
          </button>
          <a
            href={`/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-[#f5f7fa] px-3 py-1.5 text-xs font-bold text-destiny-grey/70 transition hover:bg-black/5 hover:text-destiny-grey"
          >
            View live
            <span className="material-symbols-rounded text-sm">open_in_new</span>
          </a>
        </div>
      ) : (
        /* ── Form mode: full header ── */
        <div className="border-b border-black/5 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-6">
            <Link
              href="/admin/builder"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-destiny-grey/60 hover:text-destiny-orange transition"
            >
              <span className="material-symbols-rounded text-base">arrow_back</span>
              Back to pages
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                <span className="material-symbols-rounded text-xs">auto_awesome</span>
                AI generated
              </span>
              <span className="text-xs font-mono text-destiny-grey/50">/{page.slug}</span>
              <a
                href={`/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-destiny-grey/60 hover:text-destiny-orange"
              >
                View live
                <span className="material-symbols-rounded text-sm">open_in_new</span>
              </a>
            </div>
            <div className="mt-2 flex items-end justify-between gap-4">
              <h1 className="text-3xl font-black tracking-tight text-destiny-grey md:text-4xl">
                {page.title}
              </h1>

              {!noTexts && (
                <div className="hidden md:flex items-center gap-1 rounded-xl border border-black/8 bg-[#f5f7fa] p-1">
                  <button
                    type="button"
                    onClick={() => setMode("form")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-destiny-grey shadow-sm"
                  >
                    <span className="material-symbols-rounded text-sm">list</span>
                    Form
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMode("visual"); setActivePick(null); }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-destiny-grey/60 transition hover:text-destiny-grey"
                  >
                    <span className="material-symbols-rounded text-sm">visibility</span>
                    Visual
                  </button>
                </div>
              )}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-destiny-grey/70">
              Edit any text below. Saving queues a workflow that updates the
              source on <code className="rounded bg-destiny-grey/5 px-1 py-0.5 font-mono text-xs">main</code>,
              type-checks, and pushes — usually under a minute.
            </p>
          </div>
        </div>
      )}

      {/* Alerts */}
      {submitted && (
        <div className="mx-auto w-full max-w-5xl px-6 pt-4">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <span className="material-symbols-rounded mt-0.5 text-emerald-600">check_circle</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-800">
                {submitted.editCount} edit{submitted.editCount === 1 ? "" : "s"} queued
              </p>
              <p className="mt-0.5 text-xs text-emerald-700">
                The workflow is updating <code className="font-mono">main</code> now. Refresh in
                about a minute to see the new copy.
              </p>
              {submitted.runUrl && (
                <a
                  href={submitted.runUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-900"
                >
                  View workflow run
                  <span className="material-symbols-rounded text-sm">open_in_new</span>
                </a>
              )}
            </div>
            <button type="button" onClick={() => setSubmitted(null)} className="text-emerald-700">
              <span className="material-symbols-rounded text-base">close</span>
            </button>
          </div>
        </div>
      )}

      {error && page && (
        <div className="mx-auto w-full max-w-5xl px-6 pt-4">
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <span className="material-symbols-rounded mt-0.5 text-red-600">error</span>
            <div className="flex-1 text-sm text-red-700">{error}</div>
            <button type="button" onClick={() => setError(null)} className="text-red-700">
              <span className="material-symbols-rounded text-base">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      {mode === "visual" ? (
        /* ── VISUAL MODE ─────────────────────────────────────────── */
        <div className="relative flex-1">
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            className="w-full border-0"
            style={{ height: "100vh" }}
            title={`Visual editor — ${page.title}`}
          />

          {/* Floating edit panel — slides in from the right */}
          {activePick && (
            <VisualEditPanel
              pick={activePick}
              drafts={drafts}
              onApply={(pickId, value) => setDraft(pickId, value)}
              onClose={() => setActivePick(null)}
            />
          )}
        </div>
      ) : (
        /* ── FORM MODE ───────────────────────────────────────────── */
        <div className="mx-auto w-full max-w-5xl px-6 py-8 pb-24">
          {noTexts ? (
            <div className="rounded-3xl border border-dashed border-black/15 bg-white p-12 text-center">
              <span
                className={`material-symbols-rounded text-4xl ${
                  scanning ? "animate-spin text-indigo-500" : "text-destiny-grey/30"
                }`}
              >
                {scanning ? "progress_activity" : "text_snippet"}
              </span>
              <h2 className="mt-3 text-base font-bold text-destiny-grey">
                {scanning ? "Reading the source files…" : "No editable text catalog yet"}
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-destiny-grey/60">
                {scanning
                  ? "AI is scanning page.tsx and any cloned section components to find every editable heading, body line, CTA, and link. Usually takes 20–40 seconds."
                  : "This page was generated before the visual editor was wired up. AI can scan the source files now and build a catalog so you can edit every heading, body line, CTA, and link from here."}
              </p>
              {scanError && (
                <p className="mx-auto mt-3 max-w-md rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {scanError}
                </p>
              )}
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={scanForTexts}
                  disabled={scanning}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <span
                    className={`material-symbols-rounded text-base ${scanning ? "animate-spin" : ""}`}
                  >
                    {scanning ? "progress_activity" : "auto_fix"}
                  </span>
                  {scanning ? "Scanning…" : "Scan for editable text"}
                </button>
                <Link
                  href="/admin/builder/ai"
                  className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
                >
                  <span className="material-symbols-rounded text-base">auto_awesome</span>
                  Or re-generate from scratch
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {grouped.map(({ section, items }) => (
                <section
                  key={section}
                  className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm md:p-7"
                >
                  <h2 className="mb-1 text-[11px] font-bold uppercase tracking-[0.22em] text-destiny-grey/50">
                    {section}
                  </h2>
                  <p className="mb-5 text-xs text-destiny-grey/40 font-mono">
                    {items[0].file}
                  </p>

                  <div className="space-y-5">
                    {items.map((t) => {
                      const draft = drafts[t.id];
                      const current = draft !== undefined ? draft : t.value;
                      const dirty = draft !== undefined && draft !== t.value;
                      return (
                        <Field
                          key={t.id}
                          label={t.label}
                          kind={t.kind}
                          value={current}
                          original={t.value}
                          dirty={dirty}
                          onChange={(v) => setDraft(t.id, v)}
                          onReset={() => {
                            setDrafts((prev) => {
                              const next = { ...prev };
                              delete next[t.id];
                              return next;
                            });
                          }}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating command dock */}
      <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-2xl border border-black/8 bg-white/90 px-3 py-2.5 shadow-xl shadow-black/8 backdrop-blur-xl">
          {dirtyEdits.length === 0 ? (
            <span className="flex items-center gap-2 px-1 text-xs text-destiny-grey/40">
              <span className="h-1.5 w-1.5 rounded-full bg-black/15" />
              No changes
            </span>
          ) : (
            <>
              <span className="flex items-center gap-2 pl-1 text-xs font-semibold text-destiny-grey/70">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destiny-orange text-[10px] font-black text-white">
                  {dirtyEdits.length}
                </span>
                unsaved
              </span>
              <div className="h-4 w-px bg-black/10" />
              <button
                type="button"
                onClick={discardAll}
                disabled={saving}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-destiny-grey/50 transition hover:bg-black/5 hover:text-destiny-grey disabled:opacity-40"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-destiny-orange px-4 py-2 text-xs font-bold text-white shadow-sm shadow-destiny-orange/30 transition hover:brightness-110 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-rounded animate-spin text-sm">progress_activity</span>
                    Publishing…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-rounded text-sm">cloud_upload</span>
                    Publish
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Visual edit panel ────────────────────────────────────────────────────────

function VisualEditPanel({
  pick,
  drafts,
  onApply,
  onClose,
}: {
  pick: ActivePick;
  drafts: Record<string, string>;
  onApply: (id: string, value: string) => void;
  onClose: () => void;
}) {
  const existingDraft = drafts[pick.id];
  const [text, setText] = useState(existingDraft ?? pick.value);

  const kindMeta =
    pick.kind === "heading"
      ? { label: "Heading", icon: "title", style: "bg-amber-100 text-amber-800" }
      : pick.kind === "body"
        ? { label: "Body", icon: "subject", style: "bg-sky-100 text-sky-800" }
        : pick.kind === "cta"
          ? { label: "Button", icon: "ads_click", style: "bg-destiny-orange/15 text-destiny-orange" }
          : pick.kind === "alt"
            ? { label: "Image alt", icon: "image", style: "bg-emerald-100 text-emerald-800" }
            : { label: "Link URL", icon: "link", style: "bg-violet-100 text-violet-800" };

  function handleApply() {
    onApply(pick.id, text);
    onClose();
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex w-80 flex-col border-l border-black/10 bg-white shadow-2xl">
      {/* Panel header */}
      <div className="flex items-start justify-between gap-3 border-b border-black/5 p-5">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-destiny-grey/45">
            {pick.section}
          </p>
          <p className="mt-0.5 truncate text-base font-black text-destiny-grey">
            {pick.label}
          </p>
          <span
            className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${kindMeta.style}`}
          >
            <span className="material-symbols-rounded text-xs">{kindMeta.icon}</span>
            {kindMeta.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 flex-shrink-0 rounded-lg p-1 text-destiny-grey/40 transition hover:bg-black/5 hover:text-destiny-grey"
          aria-label="Close"
        >
          <span className="material-symbols-rounded text-xl">close</span>
        </button>
      </div>

      {/* Editable field */}
      <div className="flex-1 overflow-y-auto p-5">
        <label className="mb-2 block text-xs font-bold text-destiny-grey/60">
          New text
        </label>
        {pick.kind === "href" ? (
          <input
            type="url"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-black/10 px-4 py-3 font-mono text-xs text-destiny-grey focus:border-destiny-orange/50 focus:outline-none focus:ring-4 focus:ring-destiny-orange/10"
          />
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            rows={Math.min(10, Math.max(3, Math.ceil(text.length / 32)))}
            className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm text-destiny-grey focus:border-destiny-orange/50 focus:outline-none focus:ring-4 focus:ring-destiny-orange/10"
          />
        )}

        {/* Original value for reference */}
        {pick.value !== text && (
          <div className="mt-3 rounded-xl bg-black/[0.03] px-3 py-2.5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-destiny-grey/40">
              Original
            </p>
            <p className="text-xs text-destiny-grey/60 line-through">{pick.value}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 border-t border-black/5 p-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-black/10 bg-white py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={text === pick.value && !drafts[pick.id]}
          className="flex-1 rounded-xl bg-destiny-orange py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

// ── Form field ───────────────────────────────────────────────────────────────

function Field({
  label,
  kind,
  value,
  original,
  dirty,
  onChange,
  onReset,
}: {
  label: string;
  kind: EditableText["kind"];
  value: string;
  original: string;
  dirty: boolean;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  const isMultiline = kind === "body" && original.length > 80;
  const inputId = `field-${label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`;

  const kindBadge =
    kind === "heading"
      ? { label: "Heading", icon: "title", style: "bg-amber-100 text-amber-800" }
      : kind === "body"
        ? { label: "Body", icon: "subject", style: "bg-sky-100 text-sky-800" }
        : kind === "cta"
          ? { label: "Button", icon: "ads_click", style: "bg-destiny-orange/15 text-destiny-orange" }
          : kind === "alt"
            ? { label: "Image alt", icon: "image", style: "bg-emerald-100 text-emerald-800" }
            : { label: "Link URL", icon: "link", style: "bg-violet-100 text-violet-800" };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="text-sm font-bold text-destiny-grey">
          {label}
        </label>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${kindBadge.style}`}
        >
          <span className="material-symbols-rounded text-xs">{kindBadge.icon}</span>
          {kindBadge.label}
        </span>
        {dirty && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destiny-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-destiny-orange">
            <span className="h-1.5 w-1.5 rounded-full bg-destiny-orange" />
            Edited
          </span>
        )}
      </div>
      {isMultiline ? (
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.min(8, Math.max(3, Math.ceil(value.length / 70)))}
          className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm text-destiny-grey transition focus:border-destiny-orange/50 focus:outline-none focus:ring-4 focus:ring-destiny-orange/10 ${
            dirty ? "border-destiny-orange/40 bg-destiny-orange/[0.02]" : "border-black/10"
          }`}
        />
      ) : (
        <input
          id={inputId}
          type={kind === "href" ? "url" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-destiny-grey transition focus:border-destiny-orange/50 focus:outline-none focus:ring-4 focus:ring-destiny-orange/10 ${
            kind === "href" ? "font-mono text-xs" : ""
          } ${dirty ? "border-destiny-orange/40 bg-destiny-orange/[0.02]" : "border-black/10"}`}
        />
      )}
      {dirty && (
        <div className="mt-1.5 flex items-center justify-between text-[11px]">
          <span className="text-destiny-grey/50">
            Was: <span className="line-through">{original}</span>
          </span>
          <button
            type="button"
            onClick={onReset}
            className="font-bold text-destiny-grey/60 hover:text-destiny-orange"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
