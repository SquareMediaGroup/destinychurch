"use client";

// Stats for one links page: views, visitors, clicks and click-through, a daily
// chart, and which blocks, sites and QR/NFC tags the traffic came from.
// Built from the same DayChart and BarRows as /admin/analytics, so the two
// read the same way.

import { useEffect, useState } from "react";
import { ErrorNote, MetricCard, TableSkeleton } from "@/components/admin/AdminUI";
import { BarRows, DayChart } from "@/components/admin/analytics/Charts";
import { compactNumber } from "@/lib/engagement";

interface Stats {
  capped: boolean;
  totals: { views: number; visitors: number; clicks: number; ctr: number | null };
  daily: { day: string; views: number; clicks: number }[];
  blocks: { id: string; type: string; label: string; clicks: number }[];
  referrers: { key: string; count: number }[];
  sources: { key: string; count: number }[];
}

const RANGES = [
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
  { value: "quarter", label: "90 days" },
];

// Blocks that can't be clicked have no row in "Clicks by block".
const CLICKABLE = new Set(["link", "event", "embed"]);

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/8 bg-white p-4 dark:border-white/8 dark:bg-destiny-grey-800">
      <h3 className="mb-3 text-sm font-black text-destiny-grey dark:text-white">{title}</h3>
      {children}
    </section>
  );
}

export default function AnalyticsTab({ pageId }: { pageId: string }) {
  const [range, setRange] = useState("month");
  // Results are tagged with the range they answer, so switching range shows
  // the loading state straight away without resetting state in the effect.
  const [result, setResult] = useState<{ range: string; stats: Stats | null; error: string | null } | null>(null);
  const current = result?.range === range ? result : null;
  const stats = current?.stats ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/links/${pageId}/analytics?range=${range}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't load stats");
        if (!cancelled) setResult({ range, stats: data as Stats, error: null });
      })
      .catch(
        (err) =>
          !cancelled &&
          setResult({ range, stats: null, error: err instanceof Error ? err.message : "Couldn't load stats" }),
      );
    return () => {
      cancelled = true;
    };
  }, [pageId, range]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            aria-pressed={range === r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              range === r.value
                ? "bg-destiny-orange text-white"
                : "bg-black/5 text-destiny-grey/60 hover:bg-black/10 dark:bg-white/10 dark:text-white/60"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        <MetricCard icon="visibility" iconColor="text-info" iconBg="bg-info/10" label="Views" loading={!stats} value={compactNumber(stats?.totals.views ?? 0)} />
        <MetricCard icon="person" iconColor="text-destiny-purple" iconBg="bg-destiny-purple/10" label="Visitors" loading={!stats} value={compactNumber(stats?.totals.visitors ?? 0)} />
        <MetricCard icon="touch_app" iconColor="text-destiny-orange" iconBg="bg-destiny-orange/10" label="Clicks" loading={!stats} value={compactNumber(stats?.totals.clicks ?? 0)} />
        <MetricCard
          icon="percent"
          iconColor="text-success"
          iconBg="bg-success/10"
          label="Click-through"
          loading={!stats}
          value={stats?.totals.ctr == null ? "—" : `${Math.round(stats.totals.ctr * 100)}%`}
        />
      </div>

      {!stats ? (
        error ? null : <TableSkeleton rows={5} columns={2} />
      ) : (
        <>
          <Panel title="Views per day">
            <DayChart points={stats.daily.map((d) => ({ day: d.day, events: d.views }))} className="text-info" />
          </Panel>
          <Panel title="Clicks by block">
            <BarRows
              rows={stats.blocks
                .filter((b) => CLICKABLE.has(b.type))
                .sort((a, b) => b.clicks - a.clicks)
                .map((b) => ({
                  key: b.id,
                  label: b.label,
                  value: b.clicks,
                  hint:
                    stats.totals.views > 0 ? `${Math.round((b.clicks / stats.totals.views) * 100)}%` : undefined,
                }))}
              emptyLabel="No clickable blocks on this page yet."
            />
          </Panel>
          <div className="grid gap-4 @md:grid-cols-2">
            <Panel title="How people arrived">
              <BarRows rows={stats.sources.map((s) => ({ key: s.key, label: s.key, value: s.count }))} emptyLabel="No visits yet." />
            </Panel>
            <Panel title="Referring sites">
              <BarRows rows={stats.referrers.map((s) => ({ key: s.key, label: s.key, value: s.count }))} emptyLabel="No visits yet." />
            </Panel>
          </div>
          <p className="text-xs text-destiny-grey/45 dark:text-white/45">
            Bots and link previews are left out. Click-through is clicks divided by views.
            {stats.capped ? " This range is busy enough that only the most recent 20,000 events are counted." : ""}
          </p>
        </>
      )}
    </div>
  );
}
