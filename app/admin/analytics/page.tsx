"use client";

// /admin/analytics — site_admin + super_admin (see the ROUTE_RULES entry in
// lib/adminRoles.ts, added alongside this page's nav entry so the two can't
// drift apart — tests/unit/admin-nav.spec.ts checks that).
//
// Three tabs, because "engagement" here is genuinely three different
// questions with three different answers:
//
//   • Short links — did printing/sharing this link work? (app/[slug])
//   • In person   — what did people actually do during a service? (/nfc, /links)
//   • Whole site  — how's the site doing in general? (Vercel Web Analytics)
//
// The first two read from our own click log (engagement_events), which has no
// reporting-window ceiling and is the source of truth for shortlinks/nfc/
// links. The third is a bonus view of whole-site traffic and degrades openly
// when it isn't configured or the Vercel plan can't answer the question asked.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader, FilterChips, Toggle } from "@/components/admin/AdminUI";
import { ShortLinksPanel } from "@/components/admin/analytics/ShortLinksPanel";
import { InPersonPanel } from "@/components/admin/analytics/InPersonPanel";
import { SitePanel } from "@/components/admin/analytics/SitePanel";
import { ENGAGEMENT_RANGES } from "@/lib/engagement";

type Tab = "links" | "person" | "site";

const TABS: { value: Tab; label: string }[] = [
  { value: "links", label: "Short links" },
  { value: "person", label: "In person" },
  { value: "site", label: "Whole site" },
];

const RANGE_KEYS = Object.keys(ENGAGEMENT_RANGES) as (keyof typeof ENGAGEMENT_RANGES)[];

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("links");
  const [range, setRange] = useState<string>("month");
  const [includeBots, setIncludeBots] = useState(false);
  // Deep-linked from a redirect row on /admin/redirects — undefined until the
  // mount effect below has run, so ShortLinksPanel isn't given a stale null
  // and then remounted a moment later with the real value.
  const [initialTarget, setInitialTarget] = useState<string | null | undefined>(undefined);

  // Deep link: /admin/analytics?tab=links&range=month&target=alpha — the same
  // idea as /admin/audit's searchParams sync (app/admin/audit/page.tsx). A
  // target implies the links tab, since that's the only one a slug means
  // anything on.
  useEffect(() => {
    const t = searchParams.get("tab");
    const r = searchParams.get("range");
    const target = searchParams.get("target");
    if (target) setTab("links");
    else if (t === "links" || t === "person" || t === "site") setTab(t);
    if (r) setRange(r);
    setInitialTarget(target);
    // Read once, on mount: after that the controls own this state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title="Analytics"
        subtitle="Which links, QR codes and tiles people actually use — and how the whole site is doing."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          <div
            className="flex rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 p-1"
            role="tablist"
            aria-label="Analytics view"
          >
            {TABS.map(({ value, label }) => (
              <button
                key={value}
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-bold transition ${
                  tab === value
                    ? "bg-destiny-orange text-white shadow-sm"
                    : "text-destiny-grey/55 hover:text-destiny-grey"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <FilterChips
          label="Time"
          options={RANGE_KEYS.map((key) => ({ value: key, label: ENGAGEMENT_RANGES[key].label }))}
          value={range}
          onChange={setRange}
        />
        {tab !== "site" && (
          <label className="ml-auto flex items-center gap-2.5 text-xs font-bold text-destiny-grey/50">
            Include link previews and crawlers
            <Toggle
              checked={includeBots}
              onChange={setIncludeBots}
              label="Include link previews and crawlers"
            />
          </label>
        )}
      </div>

      {/* Wait for the deep-link effect to resolve `target` before mounting a
          tab, so ShortLinksPanel is never mounted once with the wrong initial
          target and then remounted a moment later with the real one. */}
      {initialTarget !== undefined && (
        <>
          {tab === "links" && (
            <ShortLinksPanel range={range} includeBots={includeBots} initialTarget={initialTarget} />
          )}
          {tab === "person" && <InPersonPanel range={range} includeBots={includeBots} />}
          {tab === "site" && <SitePanel range={range} />}
        </>
      )}
    </div>
  );
}
