"use client";

// Every links page: the main /links page first, then the rest. Create a new
// one from a theme preset (or as a copy of an existing page), jump into the
// editor, or delete one. The 30-day numbers are the same views and clicks the
// editor's Stats tab shows.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  Badge,
  EmptyState,
  ErrorNote,
  Modal,
  PageHeader,
  TableSkeleton,
} from "@/components/admin/AdminUI";
import {
  FieldShell,
  SelectField,
  TextField,
  fieldInputClass,
} from "@/components/admin/blocks/fields/BasicFields";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import { compactNumber } from "@/lib/engagement";
import { THEME_PRESETS, parseTheme } from "@/lib/linkPages/theme";
import { MAIN_SLUG, SLUG_RE } from "@/lib/linkPages/types";
import { pagePath } from "@/components/admin/links/editorTypes";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  noindex: boolean;
  theme: unknown;
  avatar_url: string | null;
  updated_at: string;
  blockCount: number;
  views30: number;
  clicks30: number;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** A thumbnail of the page's theme — its background and one button. */
function ThemeChip({ theme }: { theme: unknown }) {
  const t = parseTheme(theme);
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5"
      style={{
        background:
          t.background.type === "gradient"
            ? t.background.gradient
            : t.background.color,
      }}
      aria-hidden="true"
    >
      <span
        className="block h-2.5 w-7"
        style={{
          background:
            t.button.style === "outline"
              ? "transparent"
              : t.button.style === "glass"
                ? "rgba(255,255,255,.35)"
                : t.button.bg,
          border:
            t.button.style === "outline" || t.button.style === "hard"
              ? `1.5px solid ${t.button.style === "hard" ? t.button.shadow : t.button.bg}`
              : undefined,
          borderRadius:
            t.button.radius === "pill"
              ? 999
              : t.button.radius === "square"
                ? 1
                : 4,
        }}
      />
    </span>
  );
}

export default function LinksPagesAdmin() {
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useDialog();
  const [pages, setPages] = useState<PageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [preset, setPreset] = useState(THEME_PRESETS[0].key);
  const [copyFrom, setCopyFrom] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/links", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load links pages");
      setPages(data.pages as PageRow[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't load links pages",
      );
      setPages([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setTitle("");
    setSlug("");
    setSlugTouched(false);
    setPreset(THEME_PRESETS[0].key);
    setCopyFrom("");
    setCreateError(null);
    setCreating(true);
  }

  async function create() {
    setBusy(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/admin/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          preset,
          duplicateFrom: copyFrom || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Couldn't create the page");
        return;
      }
      router.push(`/admin/links/${data.id}`);
    } catch {
      setCreateError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const slugOk = SLUG_RE.test(slug) && slug !== MAIN_SLUG;

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <PageHeader
        title="Links Pages"
        subtitle="Linktree-style pages for Instagram bios, QR codes and NFC tags."
        action={
          <Button variant="primary" shape="soft" size="sm" onClick={openCreate}>
            New page
          </Button>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {pages === null ? (
        <TableSkeleton rows={3} columns={3} />
      ) : pages.length === 0 ? (
        <EmptyState
          icon="link"
          title="No links pages yet"
          hint="Create one to get started."
        />
      ) : (
        <ul className="space-y-2">
          {pages.map((p) => {
            const isMain = p.slug === MAIN_SLUG;
            return (
              <li
                key={p.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-2xl border border-black/5 bg-white p-3 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:gap-x-4 sm:pr-4 dark:border-white/8 dark:bg-destiny-grey-800"
              >
                <ThemeChip theme={p.theme} />
                <a href={`/admin/links/${p.id}`} className="min-w-0">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate font-bold text-destiny-grey dark:text-white">
                      {p.title || pagePath(p.slug)}
                    </span>
                    {isMain && <Badge tone="orange">Main</Badge>}
                    {!p.published && <Badge>Draft</Badge>}
                    {p.noindex && p.published && (
                      <Badge tone="blue">Hidden from search</Badge>
                    )}
                  </span>
                  <span className="block truncate text-xs text-destiny-grey/50 dark:text-white/50">
                    {pagePath(p.slug)} · {p.blockCount} block
                    {p.blockCount === 1 ? "" : "s"}
                  </span>
                </a>
                {/* Phones: the numbers take their own row under the title. */}
                <div className="order-last col-span-3 flex items-center gap-4 border-t border-black/5 pt-2 pl-[3.75rem] sm:order-none sm:col-span-1 sm:border-0 sm:pt-0 sm:pl-0 sm:text-right dark:border-white/8">
                  <div>
                    <p className="text-sm font-black text-destiny-grey dark:text-white">
                      {compactNumber(p.views30)}
                    </p>
                    <p className="text-[11px] text-destiny-grey/45 dark:text-white/45">
                      views
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-destiny-grey dark:text-white">
                      {compactNumber(p.clicks30)}
                    </p>
                    <p className="text-[11px] text-destiny-grey/45 dark:text-white/45">
                      clicks
                    </p>
                  </div>
                  <span className="hidden text-[11px] text-destiny-grey/40 dark:text-white/40 sm:block">
                    last 30 days
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={pagePath(p.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${pagePath(p.slug)} in a new tab`}
                    title="Open live page"
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-destiny-grey/50 hover:bg-black/5 dark:text-white/50"
                  >
                    <span
                      className="material-symbols-rounded text-xl"
                      aria-hidden="true"
                    >
                      open_in_new
                    </span>
                  </a>
                  {!isMain && (
                    <button
                      type="button"
                      aria-label={`Delete ${pagePath(p.slug)}`}
                      title="Delete page"
                      onClick={async () => {
                        const ok = await confirm({
                          title: `Delete ${pagePath(p.slug)}?`,
                          message:
                            "The page, its blocks and every form response sent through it will be deleted. Printed QR codes pointing at it will stop working.",
                          confirmLabel: "Delete page",
                          tone: "danger",
                        });
                        if (!ok) return;
                        const res = await fetch(`/api/admin/links?id=${p.id}`, {
                          method: "DELETE",
                        });
                        const data = await res.json().catch(() => ({}));
                        if (!res.ok) {
                          toast.error(
                            data.error || "Couldn't delete that page.",
                          );
                          return;
                        }
                        setPages((prev) =>
                          (prev ?? []).filter((x) => x.id !== p.id),
                        );
                        toast.success(`${pagePath(p.slug)} deleted`, "Deleted");
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-destiny-grey/40 hover:bg-destiny-red/5 hover:text-destiny-red"
                    >
                      <span
                        className="material-symbols-rounded text-xl"
                        aria-hidden="true"
                      >
                        delete
                      </span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <Modal onClose={() => setCreating(false)} title="New links page">
          <div className="space-y-4">
            <TextField
              label="Name"
              value={title}
              maxLength={80}
              placeholder="e.g. Destiny Youth"
              onChange={(v) => {
                setTitle(v);
                if (!slugTouched) setSlug(slugify(v));
              }}
            />
            <FieldShell
              label="Address"
              help="Lowercase letters, numbers and dashes."
            >
              <div className="flex items-center gap-1">
                <span className="shrink-0 text-sm text-destiny-grey/50 dark:text-white/50">
                  /links/
                </span>
                <input
                  className={`${fieldInputClass} ${slug && !slugOk ? "border-destiny-red/50" : ""}`}
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    );
                  }}
                />
              </div>
            </FieldShell>
            <SelectField
              label="Start from"
              value={copyFrom ? `copy:${copyFrom}` : `preset:${preset}`}
              options={[
                ...THEME_PRESETS.map((p) => ({
                  value: `preset:${p.key}`,
                  label: `${p.label} theme (blank page)`,
                })),
                ...(pages ?? []).map((p) => ({
                  value: `copy:${p.id}`,
                  label: `A copy of ${pagePath(p.slug)}`,
                })),
              ]}
              onChange={(v) => {
                if (v.startsWith("copy:")) setCopyFrom(v.slice(5));
                else {
                  setCopyFrom("");
                  setPreset(v.slice(7));
                }
              }}
            />
            <p className="text-xs text-destiny-grey/45 dark:text-white/45">
              New pages start as drafts — publish from the Settings tab when
              it&apos;s ready.
            </p>
            {createError && <ErrorNote>{createError}</ErrorNote>}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                shape="soft"
                size="sm"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                shape="soft"
                size="sm"
                onClick={create}
                loading={busy}
                disabled={!slugOk || busy}
              >
                Create page
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
