"use client";

// The links page editor: tabs on the left, a live phone preview on the right.
//
// Everything is held in local state until Save, which sends the whole page —
// profile, theme, settings and the full block stack — in one request that
// lands in one transaction (link_page_save). The preview renders the same
// LinkPageView component as the public page, from that unsaved state.
//
// Saves carry the updated_at the editor loaded; if someone else saved in the
// meantime the server refuses rather than silently overwriting their work.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { ErrorNote, PageHeader, PageLoading } from "@/components/admin/AdminUI";
import { Sheet } from "@/components/admin/Sheet";
import { ImageUploaderContext } from "@/components/admin/blocks/fields/ImageField";
import { useEventFeed } from "@/components/admin/EventPicker";
import { useToast } from "@/components/ToastProvider";
import LinkPageView from "@/components/links/LinkPageView";
import { uploadLinksImage } from "@/lib/adminUpload";
import { parseTheme, type Theme } from "@/lib/linkPages/theme";
import { MAIN_SLUG } from "@/lib/linkPages/types";
import AnalyticsTab from "./AnalyticsTab";
import AppearanceTab from "./AppearanceTab";
import BlockList from "./BlockList";
import ProfileTab from "./ProfileTab";
import SettingsTab from "./SettingsTab";
import SubmissionsTab from "./SubmissionsTab";
import { blockProblem, pagePath, previewBlocks, type EditorBlock, type EditorPage } from "./editorTypes";

const TABS = [
  { key: "blocks", label: "Blocks", icon: "view_agenda" },
  { key: "appearance", label: "Appearance", icon: "palette" },
  { key: "profile", label: "Profile", icon: "account_circle" },
  { key: "settings", label: "Settings", icon: "tune" },
  { key: "responses", label: "Responses", icon: "inbox" },
  { key: "stats", label: "Stats", icon: "monitoring" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function isTab(value: string | null): value is TabKey {
  return TABS.some((t) => t.key === value);
}

function snapshot(page: EditorPage, blocks: EditorBlock[]): string {
  return JSON.stringify({ page, blocks });
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto h-[min(760px,calc(100vh-9rem))] w-[375px] max-w-full overflow-hidden rounded-[44px] border-[10px] border-[#141414] bg-white shadow-2xl">
      <div className="relative h-full overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}

export default function LinksEditor({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [page, setPageState] = useState<EditorPage | null>(null);
  const [blocks, setBlocksState] = useState<EditorBlock[]>([]);
  const [saved, setSaved] = useState("");
  const [savedSlug, setSavedSlug] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const tabParam = searchParams.get("tab");
  const tab: TabKey = isTab(tabParam) ? tabParam : "blocks";
  const setTab = (next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Schedules are judged against the clock; tick it so "shows from 7pm" flips
  // in the preview without a reload.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/links/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load this page");
      const loadedPage: EditorPage = { ...data.page, theme: parseTheme(data.page.theme) };
      const loadedBlocks = data.blocks as EditorBlock[];
      setPageState(loadedPage);
      setBlocksState(loadedBlocks);
      setSaved(snapshot(loadedPage, loadedBlocks));
      setSavedSlug(loadedPage.slug);
      setUpdatedAt(data.updatedAt ?? null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load this page");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const hasEvents = blocks.some((b) => b.type === "event");
  const feed = useEventFeed(hasEvents);

  const dirty = page !== null && snapshot(page, blocks) !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setPage = (patch: Partial<EditorPage>) => setPageState((p) => (p ? { ...p, ...patch } : p));
  const setTheme = (theme: Theme) => setPage({ theme });
  const setBlocks = (updater: (prev: EditorBlock[]) => EditorBlock[]) => setBlocksState(updater);

  const preview = useMemo(
    () => (page ? previewBlocks(blocks, feed.events, now) : []),
    [page, blocks, feed.events, now],
  );

  const problems = blocks.filter((b) => blockProblem(b) !== null).length;

  async function save() {
    if (!page) return;
    setSaving(true);
    setSaveError(null);
    // Social rows added but never filled in are just dropped, not an error.
    const cleanPage = { ...page, socials: page.socials.filter((s) => s.url.trim()) };
    try {
      const res = await fetch(`/api/admin/links/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: cleanPage, blocks, updatedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || "Couldn't save");
        return;
      }
      // The server fills in derived fields (an event's name and end date), so
      // take its copy of the blocks as the new baseline.
      const nextBlocks = (data.blocks ?? blocks) as EditorBlock[];
      setPageState(cleanPage);
      setBlocksState(nextBlocks);
      setSaved(snapshot(cleanPage, nextBlocks));
      setSavedSlug(cleanPage.slug);
      setUpdatedAt(data.updatedAt ?? null);
      toast.success(`${pagePath(cleanPage.slug)} is updated.`, "Saved");
    } catch {
      setSaveError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <ErrorNote>{loadError}</ErrorNote>;
  if (!page) return <PageLoading label="Loading page" />;

  const path = pagePath(savedSlug);
  const livePreview = <LinkPageView page={page} theme={page.theme} blocks={preview} preview />;

  return (
    <ImageUploaderContext.Provider value={uploadLinksImage}>
      <PageHeader
        title={page.title || path}
        subtitle={`${path}${page.published || savedSlug === MAIN_SLUG ? "" : " · Draft"}`}
        back={{ href: "/admin/links", label: "Links pages" }}
        action={
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="hidden text-xs font-bold text-warning sm:inline" role="status">
                Unsaved changes
              </span>
            )}
            <Button href={path} variant="outline" shape="soft" size="sm">
              View live
            </Button>
            <Button variant="primary" shape="soft" size="sm" onClick={save} loading={saving} disabled={!dirty || saving}>
              {saving ? "Saving" : "Save"}
            </Button>
          </div>
        }
      />

      {saveError && <ErrorNote>{saveError}</ErrorNote>}
      {problems > 0 && tab !== "blocks" && (
        <p className="mb-4 rounded-xl bg-warning/10 px-4 py-2.5 text-sm font-bold text-warning">
          {problems} block{problems === 1 ? " needs" : "s need"} finishing before this page will save — see the Blocks tab.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <div
            role="tablist"
            aria-label="Editor sections"
            className="-mx-4 mb-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0"
          >
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                type="button"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold transition ${
                  tab === t.key
                    ? "bg-destiny-grey text-white dark:bg-white dark:text-destiny-grey"
                    : "text-destiny-grey/55 hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10"
                }`}
              >
                <span className="material-symbols-rounded text-lg" aria-hidden="true">
                  {t.icon}
                </span>
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {tab === "blocks" && (
              <BlockList
                blocks={blocks}
                setBlocks={setBlocks}
                events={feed.events}
                eventsLoading={feed.loading}
                now={now}
              />
            )}
            {tab === "appearance" && <AppearanceTab theme={page.theme} setTheme={setTheme} />}
            {tab === "profile" && <ProfileTab page={page} setPage={setPage} />}
            {tab === "settings" && <SettingsTab page={page} setPage={setPage} savedSlug={savedSlug} />}
            {tab === "responses" && <SubmissionsTab pageId={id} />}
            {tab === "stats" && <AnalyticsTab pageId={id} />}
          </div>
        </div>

        <aside className="hidden lg:block" aria-label="Live preview">
          <div className="sticky top-4">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
              Live preview{dirty ? " · unsaved" : ""}
            </p>
            <PhoneFrame>{livePreview}</PhoneFrame>
          </div>
        </aside>
      </div>

      {/* Phones and tablets: the preview lives in a sheet behind a button. */}
      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex items-center gap-2 rounded-full bg-destiny-grey px-4 py-3 text-sm font-bold text-white shadow-xl lg:hidden"
      >
        <span className="material-symbols-rounded text-lg" aria-hidden="true">smartphone</span>
        Preview
      </button>
      {previewOpen && (
        <Sheet title="Preview" subtitle={dirty ? "Includes unsaved changes" : path} onClose={() => setPreviewOpen(false)}>
          <div className="-mx-4 min-h-[70vh] overflow-hidden">{livePreview}</div>
        </Sheet>
      )}

      {dirty && (
        <div className="fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 lg:hidden">
          <div className="flex w-full max-w-md items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-2xl ring-1 ring-black/10 dark:bg-destiny-grey-800">
            <span className="text-sm font-bold text-destiny-grey dark:text-white">Unsaved changes</span>
            <Button variant="primary" shape="soft" size="sm" onClick={save} loading={saving} disabled={saving}>
              Save
            </Button>
          </div>
        </div>
      )}
    </ImageUploaderContext.Provider>
  );
}
