"use client";

// The "In person" tab — /nfc seat-back tile taps and /links Next Steps card
// clicks. The one view that shows what people actually do during a service,
// as opposed to what they do off a flyer days later.

import { EmptyState, ErrorNote, MetricCard, TableSkeleton } from "@/components/admin/AdminUI";
import { DayChart } from "@/components/admin/analytics/Charts";
import { ENGAGEMENT_SOURCES, compactNumber, type EngagementSource } from "@/lib/engagement";
import { useEngagementRollup } from "@/lib/useEngagementRollup";

function SourceSection({
  source,
  range,
  includeBots,
}: {
  source: EngagementSource;
  range: string;
  includeBots: boolean;
}) {
  const meta = ENGAGEMENT_SOURCES[source];
  const { data, loading, error } = useEngagementRollup({ range, source, includeBots });

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="material-symbols-rounded text-xl text-destiny-orange">{meta.icon}</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-destiny-grey/60">
          {meta.label}
        </h3>
      </div>

      {loading ? (
        <TableSkeleton rows={3} columns={2} />
      ) : error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !data || data.totals.events === 0 ? (
        <EmptyState
          icon={meta.icon}
          title="Nothing recorded yet"
          hint={`${meta.description} Taps and clicks are only counted from the day this went live.`}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={meta.icon}
              iconColor="text-destiny-orange"
              iconBg="bg-destiny-orange/10"
              label={`Total ${meta.noun}s`}
              loading={false}
              value={compactNumber(data.totals.events)}
            />
            <MetricCard
              icon="category"
              iconColor="text-destiny-blue"
              iconBg="bg-destiny-blue/10"
              label="Different things tapped"
              loading={false}
              value={compactNumber(data.totals.targets)}
            />
          </div>

          <DayChart points={data.timeseries.map((p) => ({ day: p.day, events: p.events }))} />

          <ul className="divide-y divide-black/5 rounded-2xl border border-black/5">
            {data.byTarget.slice(0, 8).map((row) => (
              <li
                key={row.key}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate font-bold text-destiny-grey">
                  {row.label ?? row.key}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-destiny-grey/60">
                  {row.events.toLocaleString("en-GB")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function InPersonPanel({ range, includeBots }: { range: string; includeBots: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SourceSection source="nfc" range={range} includeBots={includeBots} />
      <SourceSection source="links" range={range} includeBots={includeBots} />
    </div>
  );
}
