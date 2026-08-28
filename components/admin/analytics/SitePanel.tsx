"use client";

// The "Whole site" tab — visitors, page views, top routes, countries and
// devices, from the Vercel Web Analytics API. Never shows an empty chart
// silently: not-configured, an auth failure and a plan limitation all read
// differently on screen, because an empty chart could mean any of "nobody
// visited", "nobody's set this up" or "your plan's window doesn't reach that
// far back", and those need different next steps.

import { useEffect, useState } from "react";
import { EmptyState, ErrorNote, MetricCard, TableSkeleton, ghostBtn } from "@/components/admin/AdminUI";
import { DayChart, BarRows } from "@/components/admin/analytics/Charts";
import { compactNumber, referrerName } from "@/lib/engagement";
import type { VercelAnalyticsResult } from "@/lib/vercelAnalytics.server";

const DIMENSION_LABEL: Record<string, string> = {
  day: "the daily trend",
  route: "top routes",
  country: "countries",
  deviceType: "devices",
  referrerHostname: "referrers",
};

export function SitePanel({ range }: { range: string }) {
  const [result, setResult] = useState<VercelAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Same reasoning as lib/useEngagementRollup.ts: the fetch lives inside an
    // async IIFE so every setState call, including the first setLoading(true),
    // happens inside a callback rather than synchronously in the effect body.
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/analytics/site?range=${encodeURIComponent(range)}`);
        const body = await res.json();
        if (!cancelled) setResult(body as VercelAnalyticsResult);
      } catch {
        if (!cancelled) {
          setResult({ ok: false, reason: "error", message: "Couldn't reach the server." });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [range]);

  if (loading) return <TableSkeleton rows={6} columns={3} />;
  if (!result) return null;

  if (!result.ok && result.reason === "not-configured") {
    return (
      <EmptyState
        icon="insights"
        title="Whole-site traffic isn't connected yet"
        hint={`Add ${result.missing.join(" and ")} to the environment, then redeploy. Create a token at Vercel → Account Settings → Tokens; the project ID is on the project's Settings page. If the project belongs to a team, VERCEL_ANALYTICS_TEAM_ID is needed too.`}
        action={
          <a
            href="https://vercel.com/docs/analytics/web-analytics-api"
            target="_blank"
            rel="noreferrer"
            className={ghostBtn}
          >
            Vercel Web Analytics docs
          </a>
        }
      />
    );
  }

  if (!result.ok) {
    return (
      <ErrorNote>
        {result.message}
        {result.reason === "plan"
          ? " — this is usually the plan's reporting window (Hobby: 1 month, Pro: 12 months). Try a shorter time range."
          : ""}
      </ErrorNote>
    );
  }

  const { data } = result;
  const noData = data.totals.pageviews === 0;

  return (
    <div className="flex flex-col gap-6">
      {noData ? (
        <EmptyState
          icon="insights"
          title="No visits recorded for this range"
          hint="Vercel Analytics only counts visitors who accepted analytics cookies in the banner, so this can read lower than actual traffic."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              icon="visibility"
              iconColor="text-destiny-orange"
              iconBg="bg-destiny-orange/10"
              label="Page views"
              loading={false}
              value={compactNumber(data.totals.pageviews)}
            />
            <MetricCard
              icon="person"
              iconColor="text-destiny-blue"
              iconBg="bg-destiny-blue/10"
              label="Visitors"
              loading={false}
              value={compactNumber(data.totals.visitors)}
            />
          </div>

          <div className="rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
              Page views per day
            </h3>
            <DayChart
              points={data.byDay.map((b) => ({ day: b.key, events: b.pageviews }))}
              className="text-destiny-blue"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
                Top routes
              </h3>
              <BarRows
                rows={data.byRoute.map((b) => ({ key: b.key, label: b.key, value: b.pageviews }))}
              />
            </div>
            <div className="rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
                Countries
              </h3>
              <BarRows
                rows={data.byCountry.map((b) => ({ key: b.key, label: b.key, value: b.pageviews }))}
              />
            </div>
            <div className="rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
                Devices
              </h3>
              <BarRows
                rows={data.byDevice.map((b) => ({ key: b.key, label: b.key, value: b.pageviews }))}
              />
            </div>
            <div className="rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/50">
                Referrers
              </h3>
              <BarRows
                rows={data.byReferrer.map((b) => ({
                  key: b.key,
                  label: referrerName(b.key),
                  value: b.pageviews,
                }))}
              />
            </div>
          </div>

          {data.partial.length > 0 && (
            <p className="text-center text-xs text-destiny-grey/40">
              Couldn&rsquo;t load {data.partial.map((d) => DIMENSION_LABEL[d] ?? d).join(", ")}{" "}
              for this range.
            </p>
          )}
        </>
      )}

      <p className="text-center text-xs text-destiny-grey/35">
        Counts only visitors who accepted analytics cookies — usually lower than the click
        numbers on the other tabs, which don&rsquo;t depend on cookie consent.
      </p>
    </div>
  );
}
