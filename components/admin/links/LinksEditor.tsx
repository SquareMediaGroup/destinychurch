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
  // Accepts an updater so rapid edits each build on the latest theme rather
  // than on the one captured when the control last rendered.
  const setTheme = (next: Theme | ((prev: Theme) => Theme)) =>
    setPageState((p) => (p ? { ...p, theme: typeof next === "function" ? next(p.theme) : next } : p));
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

  // The same page container every admin page uses (see /admin/nfc,
  // /admin/featured-event) — wider than most, because the editor sits beside a
  // phone-sized preview on big screens.
  const shell = "mx-auto max-w-7xl px-4 pb-40 pt-6 md:pb-28 xl:pb-10 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10";

  if (loadError)
    return (
      <div className={shell}>
        <ErrorNote>{loadError}</ErrorNote>
      </div>
    );
  if (!page)
    return (
      <div className={shell}>
        <PageLoading label="Loading page" />
      </div>
    );

  const path = pagePath(savedSlug);
  const editProfile = () => {
    setPreviewOpen(false);
    setTab("profile");
    // Focus the Heading field once the Profile tab has rendered. The tab switch
    // goes through the router, so poll briefly rather than guess a delay.
    let tries = 0;
    const focusField = () => {
      const field = document.getElementById("links-profile-name") as HTMLInputElement | null;
      if (field) {
        field.focus();
        field.select();
        field.scrollIntoView({ block: "center", behavior: "smooth" });
      } else if (tries++ < 20) {
        setTimeout(focusField, 50);
      }
    };
    focusField();
  };
  const livePreview = (
    <LinkPageView page={page} theme={page.theme} blocks={preview} preview onEditProfile={editProfile} />
  );

  return (
    <ImageUploaderContext.Provider value={uploadLinksImage}>
      <div className={shell}>
      <PageHeader
        title={page.title || path}
        subtitle={`${path}${page.published || savedSlug === MAIN_SLUG ? "" : " · Draft"}`}
        back={{ href: "/admin/links", label: "Links pages" }}
        action={
          <div className="flex items-center gap-2">
            <Button href={path} variant="outline" shape="soft" size="sm">
              View live
            </Button>
            {/* Below xl, the unsaved-changes note and Save live in the bottom bar. */}
            <div className="hidden items-center gap-2 xl:flex">
              {dirty && (
                <span className="text-xs font-bold text-warning" role="status">
                  Unsaved changes
                </span>
              )}
              <Button variant="primary" shape="soft" size="sm" onClick={save} loading={saving} disabled={!dirty || saving}>
                {saving ? "Saving" : "Save"}
              </Button>
            </div>
          </div>
        }
      />

      {saveError && <ErrorNote>{saveError}</ErrorNote>}
      {problems > 0 && tab !== "blocks" && (
        <p className="mb-4 rounded-xl bg-warning/10 px-4 py-2.5 text-sm font-bold text-warning">
          {problems} block{problems === 1 ? " needs" : "s need"} finishing before this page will save — see the Blocks tab.
        </p>
      )}

      {/* The preview column only appears at xl: below that, the sidebar plus a
          400px phone would leave the editor too narrow to use. The editor
          column is a size container, so its inner grids respond to the space
          they actually have (@md:, @xl:) rather than to the viewport. */}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="@container min-w-0">
          <div
            role="tablist"
            aria-label="Editor sections"
            className="-mx-4 mb-5 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
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

        <aside className="hidden xl:block" aria-label="Live preview">
          <div className="sticky top-4">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
              Live preview{dirty ? " · unsaved" : ""}
            </p>
            <PhoneFrame>{livePreview}</PhoneFrame>
          </div>
        </aside>
      </div>

      </div>

      {/* Below xl: one bar for Preview and Save, pinned above the admin's
          mobile tab bar (which is only there below md). */}
      <div className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6 md:left-56 xl:hidden">
        <div className="flex w-full max-w-md items-center gap-2 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 dark:bg-destiny-grey-800 dark:ring-white/10">
          <Button variant="outline" shape="soft" size="sm" onClick={() => setPreviewOpen(true)}>
            Preview
          </Button>
          <span
            className={`min-w-0 flex-1 truncate text-center text-xs font-bold ${dirty ? "text-warning" : "text-destiny-grey/45 dark:text-white/45"}`}
            role="status"
          >
            {dirty ? "Unsaved changes" : "All changes saved"}
          </span>
          <Button variant="primary" shape="soft" size="sm" onClick={save} loading={saving} disabled={!dirty || saving}>
            Save
          </Button>
        </div>
      </div>
      {previewOpen && (
        <Sheet title="Preview" subtitle={dirty ? "Includes unsaved changes" : path} onClose={() => setPreviewOpen(false)}>
          <div className="min-h-[70vh] overflow-hidden">{livePreview}</div>
        </Sheet>
      )}
    </ImageUploaderContext.Provider>
  );
}
