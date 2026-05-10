"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

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

export default function CodePageEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [page, setPage] = useState<PageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Local edits keyed by editable text id; only entries that diverge from
  // the original `value` are sent to the server on save.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState<{
    runUrl?: string;
    editCount: number;
  } | null>(null);

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

  // Group editable texts by section for clean visual layout
  const grouped = useMemo(() => {
    if (!page) return [] as Array<{ section: string; items: EditableText[] }>;
    const map = new Map<string, EditableText[]>();
    for (const t of page.editable_texts) {
      if (!map.has(t.section)) map.set(t.section, []);
      map.get(t.section)!.push(t);
    }
    // Push Metadata to the end since it's the least visible
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
          ← Back to pages
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

  return (
    <div className="min-h-screen bg-[#fafafa] pb-32">
      {/* Header */}
      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-8">
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
          <h1 className="mt-2 text-3xl font-black tracking-tight text-destiny-grey md:text-4xl">
            {page.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-destiny-grey/70">
            Edit any text below. Saving queues a workflow that updates the
            source on <code className="rounded bg-destiny-grey/5 px-1 py-0.5 font-mono text-xs">main</code>,
            type-checks, and pushes — usually under a minute.
          </p>
        </div>
      </div>

      {/* Submitted banner */}
      {submitted && (
        <div className="mx-auto max-w-4xl px-6 pt-6">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <span className="material-symbols-rounded mt-0.5 text-emerald-600">
              check_circle
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-emerald-800">
                {submitted.editCount} edit{submitted.editCount === 1 ? "" : "s"} queued
              </p>
              <p className="mt-0.5 text-xs text-emerald-700">
                The workflow is updating <code className="font-mono">main</code> now. Refresh the
                page in about a minute to see the new copy reflected here.
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
            <button
              type="button"
              onClick={() => setSubmitted(null)}
              className="text-emerald-700 hover:text-emerald-900"
              aria-label="Dismiss"
            >
              <span className="material-symbols-rounded text-base">close</span>
            </button>
          </div>
        </div>
      )}

      {error && page && (
        <div className="mx-auto max-w-4xl px-6 pt-6">
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <span className="material-symbols-rounded mt-0.5 text-red-600">error</span>
            <div className="flex-1 text-sm text-red-700">{error}</div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-700"
              aria-label="Dismiss"
            >
              <span className="material-symbols-rounded text-base">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {noTexts ? (
          <div className="rounded-3xl border border-dashed border-black/15 bg-white p-12 text-center">
            <span className="material-symbols-rounded text-4xl text-destiny-grey/30">
              text_snippet
            </span>
            <h2 className="mt-3 text-base font-bold text-destiny-grey">
              No editable text catalog for this page
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-destiny-grey/60">
              This page was generated before the visual editor was wired up. Re-generate
              it from the AI creator to enable editing.
            </p>
            <Link
              href="/admin/builder/ai"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110"
            >
              <span className="material-symbols-rounded text-base">auto_awesome</span>
              Re-generate with AI
            </Link>
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

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-black/5 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-6 py-4">
          <div className="text-xs text-destiny-grey/70">
            {dirtyEdits.length === 0 ? (
              <span>No unsaved edits</span>
            ) : (
              <span className="font-bold text-destiny-grey">
                {dirtyEdits.length} unsaved edit{dirtyEdits.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={discardAll}
              disabled={dirtyEdits.length === 0 || saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={dirtyEdits.length === 0 || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-destiny-grey/30 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {saving ? (
                <>
                  <span className="material-symbols-rounded animate-spin text-base">
                    progress_activity
                  </span>
                  Saving…
                </>
              ) : (
                <>
                  <span className="material-symbols-rounded text-base">save</span>
                  Save and publish
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        <label
          htmlFor={inputId}
          className="text-sm font-bold text-destiny-grey"
        >
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
          } ${
            dirty ? "border-destiny-orange/40 bg-destiny-orange/[0.02]" : "border-black/10"
          }`}
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
