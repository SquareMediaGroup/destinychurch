"use client";

import { useEffect, useMemo, useRef, useState, use } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { EditChangeMessage } from "@/components/admin/VisualEditOverlay";

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
  editable_texts: EditableText[] | null;
  updated_at: string;
}

type Mode = "form" | "visual";

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

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<{ runUrl?: string; editCount: number } | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState<number | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Load page ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/admin/builder/code/${id}`);
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? `Failed to load (${r.status})`);
        }
        const data = (await r.json()) as { page: PageRow };
        if (!cancelled) setPage(data.page);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // ── postMessage bridge — receives inline edits from the iframe ─────────────
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "dc-edit-change") {
        const { id, value } = e.data as EditChangeMessage;
        setDrafts((prev) => ({ ...prev, [id]: value }));
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // ── Scan / rescan ──────────────────────────────────────────────────────────
  async function scanForTexts() {
    if (!page || scanning) return;
    setScanning(true);
    setScanError(null);
    setScanCount(null);
    try {
      const r = await fetch(`/api/admin/builder/code/${page.id}/extract-texts`, { method: "POST" });
      const json = (await r.json()) as Record<string, unknown>;
      if (!r.ok) throw new Error((json.error as string) ?? `Scan failed (${r.status})`);

      // Brief pause so Supabase write is readable before re-fetch
      await new Promise((res) => setTimeout(res, 600));

      const refresh = await fetch(`/api/admin/builder/code/${page.id}`);
      if (!refresh.ok) throw new Error("Scan succeeded but page reload failed — try refreshing.");
      const refreshData = (await refresh.json()) as { page: PageRow };
      setPage(refreshData.page);
      setScanCount((refreshData.page.editable_texts ?? []).length);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  // ── Drafts ─────────────────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    if (!page) return [] as Array<{ section: string; items: EditableText[] }>;
    const map = new Map<string, EditableText[]>();
    for (const t of (page.editable_texts ?? [])) {
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
    return (page.editable_texts ?? [])
      .filter((t) => drafts[t.id] !== undefined && drafts[t.id] !== t.value)
      .map((t) => ({ id: t.id, label: t.label, value: drafts[t.id] }));
  }, [page, drafts]);

  function setDraft(textId: string, value: string) {
    setDrafts((prev) => ({ ...prev, [textId]: value }));
  }

  function discardAll() {
    if (!confirm("Discard all unsaved edits?")) return;
    setDrafts({});
  }

  async function handleSave() {
    if (!page || dirtyEdits.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error("Not authenticated — please log in and try again.");

      const r = await fetch(`/api/admin/builder/code/${id}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ edits: dirtyEdits.map((e) => ({ id: e.id, value: e.value })) }),
      });
      const json = (await r.json()) as Record<string, unknown>;
      if (!r.ok) throw new Error((json.error as string) ?? `Failed (${r.status})`);
      setSubmitted({ runUrl: json.runUrl as string | undefined, editCount: dirtyEdits.length });
      setDrafts({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading / error screens ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <span className="material-symbols-rounded animate-spin text-2xl text-destiny-grey/30">progress_activity</span>
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/admin/pages" className="text-xs font-bold text-destiny-grey/50 hover:text-destiny-orange">
          ← Pages
        </Link>
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-bold text-red-900">Couldn&apos;t load this page</p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!page) return null;

  const noTexts = (page.editable_texts ?? []).length === 0;
  const iframeUrl = `/${page.slug}?__edit=1&__editId=${page.id}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">

      {/* ── Header ── */}
      {mode === "visual" ? (
        <div className="fixed top-3 right-4 z-40 flex items-center gap-2 rounded-2xl border border-black/10 bg-white/95 px-3 py-2 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMode("form")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#f5f7fa] px-3 py-1.5 text-xs font-bold text-destiny-grey/70 transition hover:bg-black/5 hover:text-destiny-grey"
          >
            <span className="material-symbols-rounded text-sm">arrow_back</span>
            Form
          </button>
          <button
            type="button"
            onClick={scanForTexts}
            disabled={scanning}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#f5f7fa] px-3 py-1.5 text-xs font-bold text-destiny-grey/70 transition hover:bg-black/5 hover:text-destiny-orange disabled:opacity-50"
          >
            <span className={`material-symbols-rounded text-sm ${scanning ? "animate-spin" : ""}`}>
              {scanning ? "progress_activity" : "refresh"}
            </span>
            {scanning ? "Scanning…" : "Rescan"}
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
        <div className="border-b border-black/5 bg-white px-6 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start justify-between gap-4">
              {/* Left */}
              <div className="min-w-0">
                <Link
                  href="/admin/pages"
                  className="inline-flex items-center gap-1 text-xs font-medium text-destiny-grey/45 transition hover:text-destiny-orange"
                >
                  <span className="material-symbols-rounded text-sm">arrow_back</span>
                  Pages
                </Link>
                <h1 className="mt-0.5 text-lg font-black tracking-tight text-destiny-grey">
                  {page.title}
                </h1>
                <div className="mt-0.5 flex items-center gap-3">
                  <span className="font-mono text-xs text-destiny-grey/40">/{page.slug}</span>
                  <a
                    href={`/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-destiny-grey/45 transition hover:text-destiny-orange"
                  >
                    View live
                    <span className="material-symbols-rounded text-sm">open_in_new</span>
                  </a>
                </div>
              </div>

              {/* Right: rescan + mode toggle */}
              <div className="flex flex-shrink-0 items-center gap-2">
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={scanForTexts}
                    disabled={scanning}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-bold text-destiny-grey/60 transition hover:border-destiny-orange/30 hover:text-destiny-orange disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className={`material-symbols-rounded text-sm ${scanning ? "animate-spin" : ""}`}>
                      {scanning ? "progress_activity" : "refresh"}
                    </span>
                    {scanning ? "Scanning…" : noTexts ? "Scan page" : "Rescan"}
                  </button>
                  {scanCount !== null && !scanning && (
                    <span className="text-[11px] text-emerald-600 font-medium">
                      {scanCount} fields found
                    </span>
                  )}
                  {scanError && !scanning && (
                    <span className="max-w-[200px] text-[11px] text-red-500">{scanError}</span>
                  )}
                </div>

                {!noTexts && (
                  <div className="hidden md:flex items-center gap-0.5 rounded-xl border border-black/8 bg-[#f5f7fa] p-1">
                    <button
                      type="button"
                      onClick={() => setMode("form")}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-destiny-grey shadow-sm"
                    >
                      <span className="material-symbols-rounded text-sm">list</span>
                      Form
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("visual")}
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-destiny-grey/50 transition hover:text-destiny-grey"
                    >
                      <span className="material-symbols-rounded text-sm">visibility</span>
                      Visual
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Alerts ── */}
      {submitted && (
        <div className="mx-auto w-full max-w-3xl px-6 pt-4">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <span className="material-symbols-rounded mt-0.5 text-sm text-emerald-600">check_circle</span>
            <div className="flex-1 text-sm">
              <span className="font-bold text-emerald-800">
                {submitted.editCount} edit{submitted.editCount === 1 ? "" : "s"} queued
              </span>
              <span className="ml-1.5 text-emerald-700">— usually live within a minute.</span>
              {submitted.runUrl && (
                <a href={submitted.runUrl} target="_blank" rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-0.5 font-bold text-emerald-800 hover:underline">
                  View run
                  <span className="material-symbols-rounded text-sm">open_in_new</span>
                </a>
              )}
            </div>
            <button type="button" onClick={() => setSubmitted(null)} className="text-emerald-600/60 hover:text-emerald-800">
              <span className="material-symbols-rounded text-base">close</span>
            </button>
          </div>
        </div>
      )}

      {error && page && (
        <div className="mx-auto w-full max-w-3xl px-6 pt-4">
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="material-symbols-rounded text-base text-red-500">error</span>
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-700">
              <span className="material-symbols-rounded text-base">close</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Body ── */}
      {mode === "visual" ? (
        <div className="flex-1">
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            className="w-full border-0"
            style={{ height: "100vh" }}
            title={`Visual editor — ${page.title}`}
          />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl px-6 py-6 pb-28">
          {noTexts ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/12 bg-white py-16 text-center">
              <span className="material-symbols-rounded text-3xl text-destiny-grey/20">
                {scanning ? "progress_activity" : "manage_search"}
              </span>
              <p className="mt-3 text-sm font-semibold text-destiny-grey">
                {scanning ? "Scanning source files…" : "No text catalog yet"}
              </p>
              <p className="mt-1 max-w-xs text-xs text-destiny-grey/50">
                {scanning
                  ? "This usually takes 20–40 seconds."
                  : "Scan the page so you can edit headings, body copy, buttons and links from here."}
              </p>
              {scanError && (
                <p className="mt-3 max-w-sm rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {scanError}
                </p>
              )}
              {!scanning && (
                <button
                  type="button"
                  onClick={scanForTexts}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
                >
                  <span className="material-symbols-rounded text-base">manage_search</span>
                  Scan for editable text
                </button>
              )}
            </div>
          ) : (
            /* ── Field list ── */
            <div className="space-y-4">
              {grouped.map(({ section, items }) => (
                <div key={section}>
                  <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-destiny-grey/40">
                    {section}
                  </p>
                  <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                    {items.map((t, i) => {
                      const draft = drafts[t.id];
                      const current = draft !== undefined ? draft : t.value;
                      const dirty = draft !== undefined && draft !== t.value;
                      return (
                        <CompactField
                          key={t.id}
                          label={t.label}
                          kind={t.kind}
                          value={current}
                          original={t.value}
                          dirty={dirty}
                          divider={i > 0}
                          onChange={(v) => setDraft(t.id, v)}
                          onReset={() => setDrafts((prev) => { const n = { ...prev }; delete n[t.id]; return n; })}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Floating command dock ── */}
      <div className="fixed bottom-6 left-0 right-0 z-30 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-black/10 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur-md">
          {dirtyEdits.length === 0 ? (
            <span className="flex items-center gap-2 px-1 text-xs text-destiny-grey/35">
              <span className="h-1.5 w-1.5 rounded-full bg-black/12" />
              No changes
            </span>
          ) : (
            <>
              <span className="flex items-center gap-2 pl-1 text-xs font-semibold text-destiny-grey/60">
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
                  <><span className="material-symbols-rounded animate-spin text-sm">progress_activity</span>Publishing…</>
                ) : (
                  <><span className="material-symbols-rounded text-sm">cloud_upload</span>Publish</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compact field ─────────────────────────────────────────────────────────────

const KIND_ICON: Record<EditableText["kind"], string> = {
  heading: "title",
  body:    "subject",
  cta:     "ads_click",
  alt:     "image",
  href:    "link",
};

const KIND_COLOR: Record<EditableText["kind"], string> = {
  heading: "text-amber-500",
  body:    "text-sky-500",
  cta:     "text-destiny-orange",
  alt:     "text-emerald-500",
  href:    "text-violet-500",
};

function CompactField({
  label, kind, value, original, dirty, divider, onChange, onReset,
}: {
  label: string;
  kind: EditableText["kind"];
  value: string;
  original: string;
  dirty: boolean;
  divider: boolean;
  onChange: (v: string) => void;
  onReset: () => void;
}) {
  const isLong = kind === "body" && value.length > 60;
  const inputId = `cf-${label.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <div className={`px-4 py-3 ${divider ? "border-t border-black/[0.04]" : ""} ${dirty ? "bg-destiny-orange/[0.015]" : ""}`}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className={`material-symbols-rounded text-sm ${KIND_COLOR[kind]} opacity-70`}>
          {KIND_ICON[kind]}
        </span>
        <label htmlFor={inputId} className="text-sm font-semibold text-destiny-grey">
          {label}
        </label>
        {dirty && <span className="ml-auto h-1.5 w-1.5 flex-shrink-0 rounded-full bg-destiny-orange" />}
      </div>

      {isLong ? (
        <textarea
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={Math.min(6, Math.max(2, Math.ceil(value.length / 80)))}
          className={`w-full resize-y rounded-lg border px-3 py-2 text-sm text-destiny-grey transition focus:outline-none focus:ring-2 focus:ring-destiny-orange/15 ${
            dirty ? "border-destiny-orange/30 bg-white" : "border-black/8 bg-transparent"
          }`}
        />
      ) : (
        <input
          id={inputId}
          type={kind === "href" ? "url" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-destiny-grey transition focus:outline-none focus:ring-2 focus:ring-destiny-orange/15 ${
            kind === "href" ? "font-mono text-xs" : ""
          } ${dirty ? "border-destiny-orange/30 bg-white" : "border-black/8 bg-transparent"}`}
        />
      )}

      {dirty && (
        <div className="mt-1 flex items-center justify-between">
          <span className="truncate text-[11px] text-destiny-grey/35 line-through">{original}</span>
          <button type="button" onClick={onReset}
            className="ml-2 flex-shrink-0 text-[11px] font-semibold text-destiny-grey/40 transition hover:text-destiny-orange">
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
