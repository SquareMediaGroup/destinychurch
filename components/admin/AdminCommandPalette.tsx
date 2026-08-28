"use client";

// ⌘K / Ctrl-K: one box that finds anything in the admin.
//
// There are thirty-odd admin pages behind three collapsing sidebar dropdowns,
// and the records inside them were only reachable by navigating to the right
// list first. This searches both at once:
//
//   • pages and quick actions, locally, from the lib/adminNav registry
//   • real records (posts, products, orders, redirects, training, course dates,
//     users) from /api/admin/search, debounced, role-filtered server-side
//
// Ranking uses Fuse.js — already a dependency for Smart Search — so "aplha"
// still finds Alpha and "hodie" still finds the hoodie. The shell is
// hand-rolled rather than pulling in cmdk/react-cmdk: those bring a
// HeadlessUI or Radix dependency and their own visual language, and the only
// genuinely hard part (fuzzy ranking) is the part we already have.
//
// Empty state shows recents, so reopening yesterday's page is ⌘K then Enter.

import Fuse from "fuse.js";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  visibleItems,
  visibleQuickActions,
  type AdminNavItem,
  type AdminQuickAction,
} from "@/lib/adminNav";
import { useAdminSession } from "@/lib/useAdminSession";
import { recordAdminVisit, useAdminRecents } from "@/lib/adminRecents";
import type { AdminSearchHit } from "@/app/api/admin/search/route";
import { Kbd } from "@/components/admin/AdminUI";

/* ── Result model ──────────────────────────────────────────────────────────── */

interface Row {
  key: string;
  section: string;
  title: string;
  subtitle?: string;
  icon: string;
  href: string;
  external?: boolean;
  badge?: AdminSearchHit["badge"];
  /** Synonyms folded into the fuzzy match — not shown. */
  keywords?: string[];
}

function navRow(item: AdminNavItem): Row {
  return {
    key: `nav-${item.href}`,
    section: "Pages",
    title: item.label,
    subtitle: item.description,
    icon: item.icon,
    href: item.href,
    keywords: item.keywords,
  };
}

function actionRow(action: AdminQuickAction): Row {
  return {
    key: `action-${action.id}`,
    section: "Actions",
    title: action.label,
    icon: action.icon,
    href: action.href,
    external: action.external,
    keywords: action.keywords,
  };
}

function hitRow(hit: AdminSearchHit): Row {
  return {
    key: hit.id,
    section: hit.section,
    title: hit.title,
    subtitle: hit.subtitle,
    icon: hit.icon,
    href: hit.href,
    badge: hit.badge,
  };
}

// Alpha-tinted, so each reads fine against the palette's fixed dark glass
// panel below without a separate dark-mode variant — only "grey" needed
// fixing: the light-surface original (bg-black/5 text-destiny-grey/55) was
// built for a white card and was nearly invisible here.
const BADGE_TONES: Record<string, string> = {
  green: "bg-destiny-green/15 text-destiny-green",
  orange: "bg-destiny-orange/20 text-destiny-orange",
  red: "bg-destiny-red/15 text-destiny-red",
  grey: "bg-white/10 text-white/55",
  blue: "bg-destiny-blue/15 text-destiny-blue",
};

/* ── Context ───────────────────────────────────────────────────────────────── */

interface CommandContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
  openShortcuts: () => void;
}

const CommandContext = createContext<CommandContextValue | null>(null);

/** Lets the header/sidebar buttons open the palette without prop drilling. */
export function useAdminCommand(): CommandContextValue {
  return (
    useContext(CommandContext) ?? {
      open: () => {},
      close: () => {},
      isOpen: false,
      openShortcuts: () => {},
    }
  );
}

/* ── Keyboard shortcuts ────────────────────────────────────────────────────── */

// "g then key" jumps, the way GitHub and Linear do it — no modifier to
// remember, and it can't collide with a browser shortcut.
const GOTO: Record<string, string> = {
  d: "/admin",
  p: "/admin/posts",
  t: "/admin/training",
  s: "/admin/store",
  o: "/admin/store/orders",
  r: "/admin/redirects",
  u: "/admin/users",
  b: "/admin/banner",
};

function isTypingInto(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return (
    tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable
  );
}

/* ── Provider ──────────────────────────────────────────────────────────────── */

export function AdminCommandProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const gotoArmed = useRef(false);
  const gotoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);

  // Remember where we've been, for the dashboard and the palette's empty state.
  useEffect(() => {
    recordAdminVisit(pathname);
  }, [pathname]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ⌘K works even inside a field — that's the point of a global palette.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((o) => !o);
        return;
      }

      if (isTypingInto(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (gotoArmed.current) {
        const target = GOTO[e.key.toLowerCase()];
        gotoArmed.current = false;
        if (gotoTimer.current) clearTimeout(gotoTimer.current);
        if (target) {
          e.preventDefault();
          router.push(target);
        }
        return;
      }

      if (e.key.toLowerCase() === "g") {
        gotoArmed.current = true;
        // Forget the prefix if the second key never comes, so a stray "g"
        // doesn't silently swallow the next letter you type.
        if (gotoTimer.current) clearTimeout(gotoTimer.current);
        gotoTimer.current = setTimeout(() => {
          gotoArmed.current = false;
        }, 1200);
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (gotoTimer.current) clearTimeout(gotoTimer.current);
    };
  }, [router]);

  const value = useMemo(
    () => ({ open, close, isOpen, openShortcuts }),
    [open, close, isOpen, openShortcuts],
  );

  return (
    <CommandContext.Provider value={value}>
      {children}
      {/* AdminCommandProvider owns this one conditional render site, so an
          exit animation can be added here without touching any of its
          callers — same reasoning as DialogProvider.tsx's own AnimatePresence. */}
      <AnimatePresence>{isOpen && <Palette key="palette" onClose={close} />}</AnimatePresence>
      <AnimatePresence>
        {shortcutsOpen && (
          <ShortcutSheet key="shortcuts" onClose={() => setShortcutsOpen(false)} />
        )}
      </AnimatePresence>
    </CommandContext.Provider>
  );
}

/* ── Palette ───────────────────────────────────────────────────────────────── */

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { roles } = useAdminSession();
  const { recents } = useAdminRecents();
  const [query, setQuery] = useState("");
  const [fetchedHits, setFetchedHits] = useState<AdminSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const [activeQuery, setActiveQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const trimmed = query.trim();
  // Below the fetch threshold there are no record hits by definition, and
  // deriving that beats clearing state in an effect (which would flash the
  // previous query's results for a frame). Memoised so the empty case keeps a
  // stable identity and doesn't re-run the row assembly below every render.
  const hits = useMemo(
    () => (trimmed.length < 2 ? [] : fetchedHits),
    [trimmed, fetchedHits],
  );

  // React's documented "adjust state when a prop changes" pattern: the
  // highlight belongs to a query, so a new query resets it during render
  // rather than one render later.
  if (activeQuery !== query) {
    setActiveQuery(query);
    setActive(0);
  }

  /* Local candidates — pages and actions the signed-in admin can reach. */
  const localRows = useMemo(() => {
    const pages = visibleItems(roles).map(navRow);
    const actions = visibleQuickActions(roles).map(actionRow);
    return [...actions, ...pages];
  }, [roles]);

  const fuse = useMemo(
    () =>
      new Fuse(
        localRows.map((row) => ({
          row,
          // Fold the registry keywords into one searchable field so typing
          // "shortener" finds Redirects and "permissions" finds Users.
          keywords: [row.subtitle ?? "", ...(row.keywords ?? [])].join(" "),
        })),
        {
          keys: [
            { name: "row.title", weight: 0.6 },
            { name: "keywords", weight: 0.4 },
          ],
          // Tighter than the list-search threshold (0.4). The palette ranks a
          // small set of short strings, where 0.4 let "redir" match "Featured
          // Event" and "View live site" — eleven results for a query with one
          // obvious answer. Scores come back so weak matches can be dropped.
          threshold: 0.3,
          ignoreLocation: true,
          minMatchCharLength: 2,
          includeScore: true,
        },
      ),
    [localRows],
  );

  /* Remote records — debounced so a typed word is one request, not eight. */
  useEffect(() => {
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearching(true);
      fetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : { hits: [] }))
        .then((data) => setFetchedHits(Array.isArray(data.hits) ? data.hits : []))
        .catch(() => {
          /* aborted or offline — pages and actions still work */
        })
        // Runs on abort too, so a superseded query always clears the spinner.
        .finally(() => setSearching(false));
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  /* Assemble the visible list. */
  const rows = useMemo(() => {
    if (!trimmed) {
      const recentRows = recents
        .map((path) => {
          const item = visibleItems(roles).find((i) => i.href === path);
          return item ? { ...navRow(item), section: "Recent", key: `recent-${path}` } : null;
        })
        .filter((r): r is Row => r !== null);
      // No history yet (or nothing in it they can still see): show the actions
      // and pages rather than an empty box.
      return recentRows.length > 0 ? [...recentRows, ...localRows] : localRows;
    }

    // A near-exact hit anywhere in the set means the tail of the ranking is
    // noise; keep only what's in the same league as the best match.
    const scored = fuse.search(trimmed);
    const best = scored[0]?.score ?? 0;
    const cutoff = Math.max(best * 4, 0.15);
    const local = scored
      .filter((r) => (r.score ?? 1) <= cutoff)
      .map((r) => r.item.row);

    return [...local, ...hits.map(hitRow)];
  }, [trimmed, fuse, hits, localRows, recents, roles]);

  /*
   * Collect rows into one block per section.
   *
   * Sections appear in the order their best match did — Fuse returns results
   * ranked by score, interleaved across sections — but each section is then
   * merged into a single block. Grouping only consecutive runs instead gave
   * headings like "Pages, Actions, Pages, Pages, Actions" for one query, and
   * duplicated the section name as a React key.
   */
  const groups = useMemo(() => {
    const bySection = new Map<string, Row[]>();
    for (const row of rows) {
      const existing = bySection.get(row.section);
      if (existing) existing.push(row);
      else bySection.set(row.section, [row]);
    }
    return [...bySection].map(([section, sectionRows]) => ({
      section,
      rows: sectionRows,
    }));
  }, [rows]);

  const flat = useMemo(() => groups.flatMap((g) => g.rows), [groups]);

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const go = useCallback(
    (row: Row) => {
      onClose();
      if (row.external) window.open(row.href, "_blank", "noopener,noreferrer");
      else router.push(row.href);
    },
    [onClose, router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown" || (e.key === "n" && e.ctrlKey)) {
      e.preventDefault();
      setActive((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
      return;
    }
    if (e.key === "ArrowUp" || (e.key === "p" && e.ctrlKey)) {
      e.preventDefault();
      setActive((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const row = flat[active];
      if (row) go(row);
    }
  }

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let index = -1;

  // The fixed dark "glass" identity — the same treatment as AuditAsk's answer
  // panel and the onboarding tour (glass admin-glass in app/globals.css) —
  // rather than a surface that flips with the admin's own light/dark toggle.
  // It's an overlay dimming the whole page, the same category as those two,
  // not persistent chrome, so it doesn't need to react to the theme at all —
  // which conveniently sidesteps a real wiring problem: AdminCommandProvider
  // mounts above /admin/layout.tsx's own `.dark`-carrying wrapper div, so a
  // theme-reactive `dark:` class here would never actually match.
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.15 }}
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label="Search the admin"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="glass admin-glass mt-[8vh] w-full max-w-xl overflow-hidden rounded-3xl"
      >
        {/* Query */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="material-symbols-rounded text-xl text-white/45">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, posts, products, orders…"
            aria-label="Search pages, posts, products and orders"
            role="combobox"
            aria-expanded
            aria-controls="admin-palette-results"
            className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/35"
          />
          {searching && (
            <span className="material-symbols-rounded animate-spin text-lg text-white/40">
              progress_activity
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-rounded text-lg">close</span>
          </button>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="admin-palette-results"
          role="listbox"
          className="max-h-[min(60vh,26rem)] overflow-y-auto py-2"
        >
          {flat.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <span className="material-symbols-rounded text-3xl text-white/25">
                search_off
              </span>
              <p className="mt-2 text-sm font-bold text-white/70">
                Nothing matched “{trimmed}”
              </p>
              <p className="mt-1 text-xs text-white/40">
                Try a page name, a post title, an order number or a customer.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.section} className="mb-1">
                <p className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  {group.section}
                </p>
                {group.rows.map((row) => {
                  index += 1;
                  const isActive = index === active;
                  const rowIndex = index;
                  return (
                    <button
                      key={row.key}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive}
                      onMouseMove={() => setActive(rowIndex)}
                      onClick={() => go(row)}
                      className={`flex w-full items-center gap-3 px-5 py-2.5 text-left transition ${
                        isActive ? "bg-white/10" : ""
                      }`}
                    >
                      <span
                        className={`material-symbols-rounded text-xl ${
                          isActive ? "text-destiny-orange" : "text-white/35"
                        }`}
                      >
                        {row.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-white">
                          {row.title}
                        </span>
                        {row.subtitle && (
                          <span className="block truncate text-xs text-white/45">
                            {row.subtitle}
                          </span>
                        )}
                      </span>
                      {row.badge && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            BADGE_TONES[row.badge.tone] ?? BADGE_TONES.grey
                          }`}
                        >
                          {row.badge.text}
                        </span>
                      )}
                      {isActive && (
                        <span className="material-symbols-rounded shrink-0 text-base text-destiny-orange/80">
                          keyboard_return
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-white/10 px-5 py-2.5 text-[11px] font-medium text-white/45">
          <span className="flex items-center gap-1">
            <PaletteKbd>↑</PaletteKbd>
            <PaletteKbd>↓</PaletteKbd> move
          </span>
          <span className="flex items-center gap-1">
            <PaletteKbd>Enter</PaletteKbd> open
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            <PaletteKbd>Esc</PaletteKbd> close
          </span>
          <span className="ml-auto hidden items-center gap-1 sm:flex">
            <PaletteKbd>?</PaletteKbd> shortcuts
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * A `Kbd` for the palette's own fixed-dark glass surface. AdminUI.tsx's
 * shared `Kbd` is styled for a light card and only gains a dark variant
 * inside /admin's own `.dark` ancestor — which this component, mounted above
 * that wrapper by AdminCommandProvider, is never inside. Rather than a
 * `dark:` class that would never match, this is styled for the one
 * background it actually sits on.
 */
function PaletteKbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-white/15 bg-white/10 px-1.5 py-0.5 font-sans text-[10px] font-bold text-white/70">
      {children}
    </kbd>
  );
}

/* ── Shortcut help sheet ───────────────────────────────────────────────────── */

const SHORTCUT_GROUPS: { title: string; rows: { keys: string[]; label: string }[] }[] = [
  {
    title: "Anywhere",
    rows: [
      { keys: ["⌘", "K"], label: "Search pages, records and actions" },
      { keys: ["?"], label: "This list" },
      { keys: ["/"], label: "Jump to the search box on a list page" },
    ],
  },
  {
    title: "Go to",
    rows: [
      { keys: ["G", "D"], label: "Dashboard" },
      { keys: ["G", "P"], label: "Posts" },
      { keys: ["G", "T"], label: "Training" },
      { keys: ["G", "S"], label: "Store products" },
      { keys: ["G", "O"], label: "Orders" },
      { keys: ["G", "R"], label: "Redirects" },
      { keys: ["G", "B"], label: "Banner" },
      { keys: ["G", "U"], label: "Users" },
    ],
  },
  {
    title: "In the search box",
    rows: [
      { keys: ["↑", "↓"], label: "Move through results" },
      { keys: ["Enter"], label: "Open the highlighted result" },
      { keys: ["Esc"], label: "Close, or clear the box first" },
    ],
  },
];

function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.15 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onClick={(e) => e.stopPropagation()}
        className="glass admin-glass w-full max-w-md overflow-hidden rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-black text-white">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
                {group.title}
              </p>
              <ul className="flex flex-col gap-1.5">
                {group.rows.map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-white/70">{row.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {row.keys.map((key) => (
                        <PaletteKbd key={key}>{key}</PaletteKbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-2 border-t border-white/10 pt-4 text-xs text-white/40">
            On Windows use Ctrl where this list says ⌘.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Trigger button ────────────────────────────────────────────────────────── */

/**
 * Reads the platform once for the ⌘ / Ctrl label. useSyncExternalStore rather
 * than an effect: the value never changes, and getServerSnapshot gives it a
 * hydration-safe default instead of a mismatch on the first paint.
 */
const NEVER_CHANGES = () => () => {};
const readIsMac = () => /Mac|iPhone|iPad/.test(window.navigator.userAgent);
const assumeMac = () => true;

/** The search affordance in the header — a palette needs a visible door. */
export function CommandTrigger({ className = "" }: { className?: string }) {
  const { open } = useAdminCommand();
  const isMac = useSyncExternalStore(NEVER_CHANGES, readIsMac, assumeMac);

  return (
    <button
      type="button"
      onClick={open}
      data-tour="command-trigger"
      className={`group flex items-center gap-2 rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-3 py-2 text-sm text-destiny-grey/45 transition hover:border-black/20 hover:text-destiny-grey ${className}`}
    >
      <span className="material-symbols-rounded text-lg text-destiny-grey/35 transition group-hover:text-destiny-orange">
        search
      </span>
      <span className="font-medium">Search</span>
      <span className="ml-2 flex items-center gap-0.5">
        <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </button>
  );
}

/** Compact version for the mobile top bar, where there's no room for the label. */
export function CommandTriggerIcon({ className = "" }: { className?: string }) {
  const { open } = useAdminCommand();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Search the admin"
      data-tour="command-trigger"
      className={`flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5f7fa] text-destiny-grey transition hover:bg-black/8 ${className}`}
    >
      <span className="material-symbols-rounded text-xl">search</span>
    </button>
  );
}

