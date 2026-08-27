"use client";

// The weekly reports panel.
//
// Same reports that land in Super Admins' inboxes on a Sunday evening
// (app/api/cron/audit-weekly-report), kept here so the run of them reads as a
// history — and so a report is still findable when the email is long gone.
//
// Rendered with react-markdown, already a dependency, because the report body
// is markdown written by the model and the alternative is a second hand-rolled
// renderer alongside the email's.

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CardSkeleton,
  EmptyState,
  ErrorNote,
  cardClass,
} from "@/components/admin/AdminUI";
import { MiniBarRow, Sparkline } from "@/components/admin/AdminCharts";

interface AuditReportStats {
  total?: number;
  people?: number;
  /** Already human-labelled at write time — see app/api/cron/audit-weekly-report. */
  by_section?: Record<string, number>;
  by_action?: Record<string, number>;
  deletions?: number;
  access_changes?: number;
  failed_sign_ins?: number;
}

interface AuditReport {
  id: string;
  period_start: string;
  period_end: string;
  headline: string | null;
  body: string;
  entry_count: number;
  stats: AuditReportStats | null;
  emailed_to: string[];
  created_at: string;
}

function periodLabel(report: AuditReport): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const start = new Date(report.period_start).toLocaleDateString("en-GB", opts);
  const end = new Date(report.period_end).toLocaleDateString("en-GB", {
    ...opts,
    year: "numeric",
  });
  return `${start} – ${end}`;
}

function asBarData(record: Record<string, number> | undefined): { label: string; value: number }[] {
  return Object.entries(record ?? {}).map(([label, value]) => ({ label, value }));
}

export function AuditReports() {
  const [reports, setReports] = useState<AuditReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/audit/reports");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(data.error ?? "Couldn't load the reports.");
        else {
          setReports(data.reports ?? []);
          // The newest one opens by default — it is the one anyone came for.
          setOpenId(data.reports?.[0]?.id ?? null);
        }
      } catch {
        if (!cancelled) setError("Couldn't load the reports.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <CardSkeleton count={2} />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  if (reports.length === 0) {
    return (
      <EmptyState
        icon="mark_email_read"
        title="No weekly reports yet"
        hint="One is written and emailed to every Super Admin on Sunday evening, covering the seven days before it."
      />
    );
  }

  // Oldest → newest, for the trend line — reports arrive from the API
  // newest-first, matching the list below it.
  const entryCountTrend = [...reports].reverse().map((r) => r.entry_count);

  return (
    <div className="flex flex-col gap-3">
      {reports.length > 1 && (
        <div
          className={`${cardClass} flex items-center gap-3 px-5 py-3.5`}
        >
          <Sparkline values={entryCountTrend} tone="blue" width={140} height={26} />
          <p className="text-xs font-bold text-destiny-grey/45 dark:text-white/45">
            Changes per week, oldest to newest — {reports.length} week
            {reports.length === 1 ? "" : "s"} of reports
          </p>
        </div>
      )}

      {reports.map((report) => {
        const open = report.id === openId;
        const sectionData = asBarData(report.stats?.by_section);
        const actionData = asBarData(report.stats?.by_action);

        return (
          <div key={report.id} className={`${cardClass} overflow-hidden`}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : report.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#f5f7fa] dark:hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                  {periodLabel(report)}
                </p>
                <p className="mt-0.5 font-bold text-destiny-grey dark:text-white">
                  {report.headline ?? "Weekly report"}
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold tabular-nums text-destiny-grey/40 dark:text-white/40">
                {report.entry_count} change{report.entry_count === 1 ? "" : "s"}
              </span>
              <span
                className={`material-symbols-rounded shrink-0 text-xl text-destiny-grey/35 transition dark:text-white/35 ${
                  open ? "rotate-180" : ""
                }`}
              >
                expand_more
              </span>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  key="content"
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="border-t border-black/5 px-5 py-4 dark:border-white/8">
                    {(sectionData.length > 0 || actionData.length > 0) && (
                      <div className="mb-5 grid gap-4 sm:grid-cols-2">
                        {sectionData.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                              By area
                            </p>
                            <MiniBarRow data={sectionData} />
                          </div>
                        )}
                        {actionData.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                              By kind of change
                            </p>
                            <MiniBarRow data={actionData} />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="prose-audit text-sm leading-relaxed text-destiny-grey/80 dark:text-white/80">
                      <ReactMarkdown
                        components={{
                          h1: ({ children }) => (
                            <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
                              {children}
                            </p>
                          ),
                          h2: ({ children }) => (
                            <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
                              {children}
                            </p>
                          ),
                          h3: ({ children }) => (
                            <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-destiny-grey/45 dark:text-white/45">
                              {children}
                            </p>
                          ),
                          p: ({ children }) => <p className="mb-3">{children}</p>,
                          ul: ({ children }) => (
                            <ul className="mb-3 flex flex-col gap-1.5">{children}</ul>
                          ),
                          li: ({ children }) => (
                            <li className="flex gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destiny-orange" />
                              <span className="min-w-0">{children}</span>
                            </li>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-bold text-destiny-grey dark:text-white">
                              {children}
                            </strong>
                          ),
                          a: ({ children }) => <span>{children}</span>,
                        }}
                      >
                        {report.body}
                      </ReactMarkdown>
                    </div>

                    {report.emailed_to.length > 0 && (
                      <p className="mt-4 border-t border-black/5 pt-3 text-xs text-destiny-grey/40 dark:border-white/8 dark:text-white/40">
                        Emailed to {report.emailed_to.join(", ")}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
