"use client";

// The audit log — Super Admin only (fail-closed: /admin/audit isn't in
// ROUTE_RULES, so nothing but super_admin reaches it).
//
// Two ways in, on purpose:
//
//   • Ask it. "Who added the Faith Hoodie to the store?" — for when you don't
//     know which section a thing lived in or what we call it.
//   • Read it. Search, filter by person/section/kind/date, open any entry for
//     the field-by-field before and after. For when you want the record itself
//     rather than a summary of it.
//
// Filtering is server-side, unlike every other admin list (lib/useAdminList.ts).
// Those endpoints return a whole collection because a collection is a hundred
// rows; this one grows by every change anyone makes and is read newest-first,
// so it pages with a keyset cursor and filters in Postgres.

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  PageHeader,
  EmptyState,
  ErrorNote,
  FilterChips,
  SearchInput,
  TableSkeleton,
  ghostBtn,
} from "@/components/admin/AdminUI";
import { Sparkline } from "@/components/admin/AdminCharts";
import { AuditAsk } from "@/components/admin/audit/AuditAsk";
import { AuditDetail } from "@/components/admin/audit/AuditDetail";
import { AuditReports } from "@/components/admin/audit/AuditReports";
import {
  AUDIT_ACTION_KEYS,
  AUDIT_RANGES,
  AUDIT_SECTION_KEYS,
  actionIcon,
  actionLabel,
  actionTone,
  actorName,
  relativeTime,
  sectionIcon,
  sectionLabel,
  siteDayKey,
  type AuditEntry,
} from "@/lib/audit";

interface Facets {
  actors: Record<string, number>;
  sections: Record<string, number>;
  actions: Record<string, number>;
  /** `YYYY-MM-DD` (church-local day) → count, over whatever the range covers. */
  byDay: Record<string, number>;
  capped: boolean;
}

/** The last N calendar days (today inclusive), oldest first — the sparkline's x-axis. */
function lastNDays(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push(siteDayKey(d));
  }
  return out;
}

/** How many of the most recent rows to animate in — a busy day shouldn't queue a 500-row waterfall. */
const STAGGER_ROWS = 20;

const RANGE_KEYS = Object.keys(AUDIT_RANGES) as (keyof typeof AUDIT_RANGES)[];

const TONE_DOT: Record<string, string> = {
  green: "bg-destiny-green",
  orange: "bg-destiny-orange",
  red: "bg-destiny-red",
  blue: "bg-destiny-blue",
  purple: "bg-destiny-purple",
  grey: "bg-destiny-grey/30",
};

export default function AuditLogPage() {
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<"activity" | "reports">("activity");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<string>("month");
  const [section, setSection] = useState("all");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");
  const [entityFilter, setEntityFilter] = useState<{
    entity: string;
    id: string | null;
  } | null>(null);

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AuditEntry | null>(null);

  // Deep link: /admin/audit?actor=sarah@… or ?q=hoodie, so a filtered view is a
  // link you can send someone — the same idea as lib/useAdminList's URL sync.
  useEffect(() => {
    const q = searchParams.get("q");
    const a = searchParams.get("actor");
    const s = searchParams.get("section");
    if (q) setSearch(q);
    if (a) setActor(a);
    if (s) setSection(s);
    // Read once, on mount: after that the controls own this state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildQuery = useCallback(
    (before?: number | null) => {
      const params = new URLSearchParams({ range });
      if (search.trim()) params.set("q", search.trim());
      if (section !== "all") params.set("section", section);
      if (action !== "all") params.set("action", action);
      if (actor !== "all") params.set("actor", actor);
      if (entityFilter) {
        params.set("entity", entityFilter.entity);
        if (entityFilter.id) params.set("entity_id", entityFilter.id);
      }
      if (before) params.set("before", String(before));
      return params.toString();
    },
    [range, search, section, action, actor, entityFilter],
  );

  // Debounced, and only the newest request is allowed to write state — typing
  // quickly otherwise lands the results in whatever order they come back.
  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/audit?${buildQuery()}`);
        const data = await res.json();
        if (id !== requestId.current) return;
        if (!res.ok) {
          setError(data.error ?? "Couldn't load the log.");
          setEntries([]);
        } else {
          setError("");
          setEntries(data.entries ?? []);
          setFacets(data.facets ?? null);
          setNextBefore(data.nextBefore ?? null);
        }
      } catch {
        if (id === requestId.current) setError("Couldn't load the log.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, search ? 250 : 0);

    return () => clearTimeout(timer);
  }, [buildQuery, search]);

  async function loadMore() {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/audit?${buildQuery(nextBefore)}`);
      const data = await res.json();
      if (res.ok) {
        setEntries((current) => [...current, ...(data.entries ?? [])]);
        setNextBefore(data.nextBefore ?? null);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  const filtering =
    Boolean(search.trim()) ||
    section !== "all" ||
    action !== "all" ||
    actor !== "all" ||
    Boolean(entityFilter);

  function clearAll() {
    setSearch("");
    setSection("all");
    setAction("all");
    setActor("all");
    setEntityFilter(null);
  }

  const sectionOptions = [
    { value: "all", label: "All areas" },
    ...AUDIT_SECTION_KEYS.filter((key) => facets?.sections[key]).map((key) => ({
      value: key,
      label: sectionLabel(key),
      count: facets?.sections[key],
    })),
  ];

  const actionOptions = [
    { value: "all", label: "All" },
    ...AUDIT_ACTION_KEYS.filter((key) => facets?.actions[key]).map((key) => ({
      value: key,
      label: actionLabel(key),
      count: facets?.actions[key],
    })),
  ];

  const actorOptions = Object.entries(facets?.actors ?? {}).sort((a, b) => b[1] - a[1]);

  // The sparkline's window tracks whichever time range is selected, so it
  // never implies more history than the filtered rows underneath it actually
  // cover — a 30-day shape over a "7 days" filter would show mostly zero and
  // read as broken, not quiet.
  const sparklineDays =
    range === "today" ? 2 : range === "week" ? 7 : range === "month" ? 30 : range === "quarter" ? 60 : 60;
  const dayCounts = facets
    ? lastNDays(sparklineDays).map((day) => facets.byDay[day] ?? 0)
    : [];
  const reduceMotion = useReducedMotion();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title="Audit Log"
        subtitle="Everything anyone does in the admin, from the moment this went live."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          <div
            className="flex rounded-xl border border-black/10 bg-white p-1 dark:border-white/10 dark:bg-destiny-grey-800"
            role="tablist"
            aria-label="Audit view"
          >
            {(
              [
                ["activity", "Activity"],
                ["reports", "Weekly reports"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
                  tab === value
                    ? "bg-destiny-orange text-white shadow-sm"
                    : "text-destiny-grey/55 hover:text-destiny-grey dark:text-white/55 dark:hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {tab === "reports" ? (
        <AuditReports />
      ) : (
        <>
          <AuditAsk onOpenEntry={setSelected} />

          <div className="mb-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search what happened"
              />
              <FilterChips
                label="Time"
                options={RANGE_KEYS.map((key) => ({
                  value: key,
                  label: AUDIT_RANGES[key].label,
                }))}
                value={range}
                onChange={setRange}
              />
              {actorOptions.length > 0 && (
                <select
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  aria-label="Filter by person"
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold text-destiny-grey/70 outline-none transition focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15 dark:border-white/10 dark:bg-destiny-grey-800 dark:text-white/70"
                >
                  <option value="all">Everyone</option>
                  {actorOptions.map(([email, count]) => (
                    <option key={email} value={email}>
                      {email} ({count})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <FilterChips
                label="Area"
                options={sectionOptions}
                value={section}
                onChange={setSection}
              />
              <FilterChips
                label="Kind of change"
                options={actionOptions}
                value={action}
                onChange={setAction}
              />
            </div>

            {entityFilter && (
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-destiny-orange/25 bg-destiny-orange/5 px-4 py-2.5 dark:border-destiny-orange/35 dark:bg-destiny-orange/10">
                <span className="material-symbols-rounded text-base text-destiny-orange">
                  filter_alt
                </span>
                <p className="text-sm font-bold text-destiny-grey dark:text-white">
                  Showing the history of one {entityFilter.entity}
                </p>
                <button
                  type="button"
                  onClick={() => setEntityFilter(null)}
                  className="ml-auto text-xs font-bold text-destiny-grey/50 transition hover:text-destiny-grey dark:text-white/50 dark:hover:text-white"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <ErrorNote>{error}</ErrorNote>

          {!loading && facets && dayCounts.some((c) => c > 0) && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
              <Sparkline values={dayCounts} tone="orange" width={160} height={28} />
              <p className="text-xs font-bold text-destiny-grey/45 dark:text-white/45">
                Activity over the last {dayCounts.length} day{dayCounts.length === 1 ? "" : "s"}
                {facets.capped ? " (capped sample)" : ""}
              </p>
            </div>
          )}

          {loading ? (
            <TableSkeleton rows={8} columns={4} />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={filtering ? "search_off" : "history"}
              title={filtering ? "Nothing matches" : "Nothing recorded yet"}
              hint={
                filtering
                  ? "Try a wider time range, or clear the filters."
                  : "Every change anyone makes in the admin from now on shows up here. Anything done before the log went live isn't recorded."
              }
              action={
                filtering ? (
                  <button
                    className="text-sm font-bold text-destiny-orange hover:brightness-110"
                    onClick={clearAll}
                  >
                    Clear search and filters
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm dark:border-white/8 dark:bg-destiny-grey-800">
                <ul className="divide-y divide-black/5 dark:divide-white/8">
                  {entries.map((entry, i) => (
                    <motion.li
                      key={entry.id}
                      initial={
                        reduceMotion || i >= STAGGER_ROWS ? false : { opacity: 0, y: 4 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.18,
                        delay: reduceMotion ? 0 : Math.min(i, STAGGER_ROWS) * 0.02,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelected(entry)}
                        className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-[#f5f7fa] dark:hover:bg-white/10"
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            TONE_DOT[actionTone(entry.action)] ?? TONE_DOT.grey
                          }`}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-destiny-grey dark:text-white">
                            {entry.summary}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-destiny-grey/45 dark:text-white/45">
                            <span className="font-bold text-destiny-grey/60 dark:text-white/60">
                              {actorName(entry.actor_email)}
                            </span>
                            <span aria-hidden>·</span>
                            <span
                              title={new Date(entry.created_at).toLocaleString("en-GB")}
                            >
                              {relativeTime(entry.created_at)}
                            </span>
                            <span aria-hidden>·</span>
                            <span className="inline-flex items-center gap-1">
                              <span className="material-symbols-rounded text-sm">
                                {sectionIcon(entry.section)}
                              </span>
                              {sectionLabel(entry.section)}
                            </span>
                            {entry.changes && (
                              <>
                                <span aria-hidden>·</span>
                                <span>
                                  {Object.keys(entry.changes).length} field
                                  {Object.keys(entry.changes).length === 1 ? "" : "s"}
                                </span>
                              </>
                            )}
                          </span>
                        </span>
                        <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs font-bold text-destiny-grey/35 sm:flex dark:text-white/35">
                          <span className="material-symbols-rounded text-base">
                            {actionIcon(entry.action)}
                          </span>
                          {actionLabel(entry.action)}
                        </span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                {nextBefore ? (
                  <button onClick={loadMore} disabled={loadingMore} className={ghostBtn}>
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                ) : (
                  <p className="text-xs font-bold text-destiny-grey/35 dark:text-white/35">
                    That&rsquo;s everything for this period.
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}

      {selected && (
        <AuditDetail
          entry={selected}
          onClose={() => setSelected(null)}
          onFilterActor={(email) => {
            setActor(email);
            setRange("all");
            setTab("activity");
            setSelected(null);
          }}
          onFilterEntity={(entity, id) => {
            setEntityFilter({ entity, id });
            setRange("all");
            setTab("activity");
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
