"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PORTAL_API,
  fullName,
  formatDate,
  leaveRemaining,
  type Staff,
  type LeaveRequest,
  type ChecklistItem,
  type Review,
} from "@/lib/hr";
import { PageLoading, ErrorNote } from "@/components/admin/AdminUI";

interface PortalTicket {
  status: "open" | "claimed" | "in_progress" | "delivered" | "changes_requested" | "closed" | "cancelled";
}

type PortalReview = Pick<Review, "id" | "next_review_date">;

const OPEN_TICKET_STATUSES = new Set(["open", "claimed", "in_progress", "changes_requested"]);

function initials(staff: Staff): string {
  return `${staff.first_name[0] ?? ""}${staff.last_name[0] ?? ""}`.toUpperCase();
}

/** The soonest next_review_date that hasn't already passed, or null. */
function nextUpcomingReview(reviews: PortalReview[]): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = reviews
    .map((r) => r.next_review_date)
    .filter((d): d is string => Boolean(d))
    .filter((d) => d >= today)
    .sort();
  return upcoming[0] ?? null;
}

export default function PortalHomePage() {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [leave, setLeave] = useState<LeaveRequest[]>([]);
  const [reviews, setReviews] = useState<PortalReview[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "My Portal | Destiny Church";
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${PORTAL_API}/me`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
      fetch(`${PORTAL_API}/leave`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${PORTAL_API}/reviews`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${PORTAL_API}/checklists`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${PORTAL_API}/documents`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${PORTAL_API}/design`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([s, l, rv, cl, docs, tickets]) => {
        setStaff(s);
        setLeave(Array.isArray(l) ? l : []);
        setReviews(Array.isArray(rv) ? rv : []);
        setChecklist(Array.isArray(cl) ? cl : []);
        setDocumentCount(Array.isArray(docs) ? docs.length : 0);
        setOpenTicketCount(
          Array.isArray(tickets)
            ? (tickets as PortalTicket[]).filter((t) => OPEN_TICKET_STATUSES.has(t.status)).length
            : 0,
        );
      })
      .catch(() => setError("Could not load your portal."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoading label="Loading your portal" />;

  const checklistDone = checklist.filter((c) => c.is_done).length;
  const nextReview = nextUpcomingReview(reviews);

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <ErrorNote>{error}</ErrorNote>

      {staff && (
        <>
          <div className="mb-8 flex items-center gap-4">
            {staff.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={staff.avatar_url}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-destiny-orange/10 text-base font-black text-destiny-orange">
                {initials(staff)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-destiny-grey">
                Hi {staff.first_name.split(" ")[0]}
              </h1>
              <p className="text-sm text-destiny-grey/60">
                {staff.job_title || fullName(staff)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DashCard
              href="/portal/leave"
              icon="event_busy"
              label="Holiday remaining"
              value={`${leaveRemaining(staff, leave)} / ${staff.annual_leave_entitlement} days`}
            />

            {checklist.length > 0 ? (
              <DashCard
                href="/portal/reviews"
                icon="checklist"
                label="Onboarding"
                value={`${checklistDone} / ${checklist.length} done`}
              />
            ) : null}

            <DashCard
              href="/portal/reviews"
              icon="fact_check"
              label="Next review"
              value={nextReview ? formatDate(nextReview) : "None scheduled"}
            />

            <DashCard
              href="/portal/design"
              icon="draw"
              label="Design requests"
              value={openTicketCount === 0 ? "None open" : `${openTicketCount} open`}
            />

            <DashCard
              href="/portal/documents"
              icon="folder_open"
              label="Documents"
              value={documentCount === 0 ? "None yet" : `${documentCount} file${documentCount === 1 ? "" : "s"}`}
            />

            <DashCard href="/portal/team" icon="groups" label="Team" value="Meet the team" />
          </div>
        </>
      )}
    </div>
  );
}

function DashCard({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-3xl border border-black/5 bg-white p-5 shadow-sm transition hover:border-destiny-orange/30"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
        <span className="material-symbols-rounded text-xl text-destiny-orange" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">{label}</p>
        <p className="mt-0.5 font-bold text-destiny-grey">{value}</p>
      </div>
    </Link>
  );
}
