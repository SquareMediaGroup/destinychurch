"use client";

// The "Short links" tab — clicks on the vanity URLs managed at
// /admin/redirects. This is the number a flyer print run gets judged on, so
// it leads with clicks and lets a click-through count separate the QR scans
// on paper from the same link posted online (src_tag).

import { useState } from "react";
import { EmptyState, ErrorNote, MetricCard, TableSkeleton } from "@/components/admin/AdminUI";
import { DayChart, BarRows } from "@/components/admin/analytics/Charts";
import { compactNumber, countryName, referrerName, srcTagLabel } from "@/lib/engagement";
import { useEngagementRollup } from "@/lib/useEngagementRollup";

export function ShortLinksPanel({
  range,
  includeBots,
}: {
  range: string;
  includeBots: boolean;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const { data, loading, error } = useEngagementRollup({
    range,
    source: "redirect",
    target,
    includeBots,
  });

  if (loading) return <TableSkeleton rows={6} columns={3} />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return null;

  const noData = data.totals.events === 0 && data.totals.bots === 0;
  if (noData && !target) {
    return (
      <EmptyState
        icon="alt_route"
        title="No clicks recorded yet"
        hint="Clicks are only counted from the day this went live — anything before that isn't recorded. Print or share a redirect from /admin/redirects and check back."
      />
    );
  }

  const qr = data.bySrcTag.find((b) => b.key === "qr")?.events ?? 0;
  const topTarget = data.byTarget[0];

  return (
    <div className="flex flex-col gap-6">
      {target && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-destiny-orange/25 bg-destiny-orange/5 px-4 py-2.5">
          <span className="material-symbols-rounded text-base text-destiny-orange">
            filter_alt
          </span>
          <p className="text-sm font-bold text-destiny-grey">
            Showing only <span className="font-mono">/{target}</span>
          </p>
          <button
            type="button"
            onClick={() => setTarget(null)}
            className="ml-auto text-xs font-bold text-destiny-grey/50 transition hover:text-destiny-grey"
          >
            Clear
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="ads_click"
          iconColor="text-destiny-orange"
          iconBg="bg-destiny-orange/10"
          label="Clicks"
          loading={false}
          value={compactNumber(data.totals.events)}
        />
        <MetricCard
          icon="person"
          iconColor="text-destiny-blue"
          iconBg="bg-destiny-blue/10"
          label="Unique visitors"
          loading={false}
          value={compactNumber(data.totals.visitors)}
        />
        <MetricCard
          icon="qr_code_2"
          iconColor="text-destiny-green"
          iconBg="bg-destiny-green/10"
          label="Scanned from print"
          loading={false}
          value={compactNumber(qr)}
        />
        <MetricCard
          icon="smart_toy"
          iconColor="text-destiny-grey/50"
          iconBg="bg-black/5"
          label="Link previews filtered"
          loading={false}
          value={compactNumber(data.totals.bots)}
        />
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
          Clicks per day
        </h3>
        <DayChart points={data.timeseries.map((p) => ({ day: p.day, events: p.events }))} />
      </div>

      {!target && (
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <h3 className="border-b border-black/5 px-5 py-4 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
            Top links
          </h3>
          {data.byTarget.length === 0 ? (
            <p className="px-5 py-6 text-sm text-destiny-grey/40">No clicks in this range.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {data.byTarget.map((row) => (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => setTarget(row.key)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-[#f5f7fa]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-destiny-grey">
                        {row.label ?? row.key}
                      </span>
                      <span className="block truncate font-mono text-xs text-destiny-grey/45">
                        /{row.key}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-destiny-grey/70">
                      {row.events.toLocaleString("en-GB")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
            Country
          </h3>
          <BarRows
            rows={data.byCountry.map((b) => ({ key: b.key, label: countryName(b.key), value: b.events }))}
          />
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
            Where from
          </h3>
          <BarRows
            rows={data.byReferrer.map((b) => ({
              key: b.key,
              label: referrerName(b.key),
              value: b.events,
            }))}
          />
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
            Device
          </h3>
          <BarRows
            rows={data.byDevice.map((b) => ({ key: b.key, label: b.key, value: b.events }))}
          />
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
            How they got here
          </h3>
          <BarRows
            rows={data.bySrcTag.map((b) => ({
              key: b.key,
              label: srcTagLabel(b.key),
              value: b.events,
            }))}
            emptyLabel="Nobody has used a tagged link yet."
          />
        </div>
      </div>

      {topTarget && (
        <p className="text-center text-xs text-destiny-grey/35">
          Busiest link this period: /{topTarget.key}
        </p>
      )}
    </div>
  );
}
