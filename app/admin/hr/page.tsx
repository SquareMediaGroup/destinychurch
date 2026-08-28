"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  API,
  fullName,
  formatDate,
  type Staff,
  type LeaveRequest,
  type Review,
} from "@/lib/hr";
import type { Job, JobApplication } from "@/lib/jobs";
import { PageHeader, Badge, CardSkeleton } from "@/components/admin/AdminUI";
import { ADMIN_GROUPS } from "@/lib/adminNav";

/** The HR group from the nav registry, minus the HR landing page itself. */
const HR_SECTIONS =
  ADMIN_GROUPS.find((g) => g.label === "HR")?.items.filter(
    (i) => i.href !== "/admin/hr",
  ) ?? [];

export default function HrDashboardPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/staff`).then((r) => r.json()),
      fetch(`${API}/leave`).then((r) => r.json()),
      fetch(`${API}/reviews`).then((r) => r.json()),
      fetch(`${API}/jobs`).then((r) => r.json()),
      fetch(`${API}/applications`).then((r) => r.json()),
    ])
      .then(([s, l, r, j, a]) => {
        setStaff(Array.isArray(s) ? s : []);
        setLeave(Array.isArray(l) ? l : []);
        setReviews(Array.isArray(r) ? r : []);
        setJobs(Array.isArray(j) ? j : []);
        setApplications(Array.isArray(a) ? a : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeStaff = staff.filter((s) => s.status !== "left").length;
  const pendingLeave = leave.filter((l) => l.status === "pending");
  const today = new Date().toISOString().slice(0, 10);
  const upcomingReviews = reviews
    .filter((r) => r.next_review_date && r.next_review_date >= today)
    .sort((a, b) => (a.next_review_date! < b.next_review_date! ? -1 : 1));
  const publishedJobs = jobs.filter((j) => j.is_published).length;
  const newApplications = applications.filter((a) => a.status === "new").length;

  const stats = [
    {
      icon: "groups",
      label: "Active staff",
      value: activeStaff,
      href: "/admin/hr/staff",
    },
    {
      icon: "event_busy",
      label: "Pending leave",
      value: pendingLeave.length,
      href: "/admin/hr/leave",
    },
    {
      icon: "work",
      label: "Open roles",
      value: publishedJobs,
      href: "/admin/hr/jobs",
    },
    {
      icon: "inbox",
      label: "New applications",
      value: newApplications,
      href: "/admin/hr/applications",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <PageHeader
        title="HR"
        subtitle="People, leave, documents and reviews at a glance."
        back={{ href: "/admin", label: "Dashboard" }}
      />

      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <Link
                key={s.label}
                href={s.href}
                className="group flex items-center gap-4 rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-5 shadow-sm transition hover:border-destiny-orange/30 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10 text-destiny-orange">
                  <span className="material-symbols-rounded text-[26px]">{s.icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-black text-destiny-grey">{s.value}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/45">
                    {s.label}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pending leave */}
            <section className="rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black text-destiny-grey">Pending leave</h2>
                <Link
                  href="/admin/hr/leave"
                  className="text-xs font-bold text-destiny-orange hover:brightness-110"
                >
                  View all
                </Link>
              </div>
              {pendingLeave.length === 0 ? (
                <p className="text-sm text-destiny-grey/45">No requests waiting.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-black/5">
                  {pendingLeave.slice(0, 5).map((l) => (
                    <li key={l.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-bold text-destiny-grey">
                          {l.hr_staff ? fullName(l.hr_staff) : "Unknown"}
                        </p>
                        <p className="text-xs text-destiny-grey/45">
                          {formatDate(l.start_date)} – {formatDate(l.end_date)}
                        </p>
                      </div>
                      <Badge tone="orange">Pending</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Upcoming reviews */}
            <section className="rounded-3xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-black text-destiny-grey">Upcoming reviews</h2>
                <Link
                  href="/admin/hr/reviews"
                  className="text-xs font-bold text-destiny-orange hover:brightness-110"
                >
                  View all
                </Link>
              </div>
              {upcomingReviews.length === 0 ? (
                <p className="text-sm text-destiny-grey/45">Nothing scheduled.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-black/5">
                  {upcomingReviews.slice(0, 5).map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="text-sm font-bold text-destiny-grey">
                          {r.hr_staff ? fullName(r.hr_staff) : "Unknown"}
                        </p>
                        <p className="text-xs text-destiny-grey/45">
                          Due {formatDate(r.next_review_date)}
                        </p>
                      </div>
                      <span className="material-symbols-rounded text-destiny-grey/30">
                        chevron_right
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Every HR section, from the nav registry — a quick-nav grid so
              Documents and Reviews (not surfaced anywhere else on this page)
              are one click away. */}
          <section className="mt-8">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
              Sections
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {HR_SECTIONS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-4 rounded-2xl border border-black/5 bg-white dark:border-white/8 dark:bg-destiny-grey-800 p-5 shadow-sm transition hover:shadow-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10 text-destiny-orange">
                    <span className="material-symbols-rounded text-xl">{item.icon}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="mb-0.5 text-sm font-black text-destiny-grey transition-colors group-hover:text-destiny-orange">
                      {item.label}
                    </p>
                    <p className="text-xs leading-relaxed text-destiny-grey/50">
                      {item.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
