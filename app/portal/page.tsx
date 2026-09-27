"use client";

import { useEffect, useRef, useState } from "react";
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
import { useToast } from "@/components/ToastProvider";

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

          {!staff.avatar_url ? (
            <AvatarOnboardingPrompt staff={staff} onChange={(s) => setStaff(s)} />
          ) : null}

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

function dismissedKey(staffId: string): string {
  return `portal-avatar-prompt-dismissed:${staffId}`;
}

// A one-time onboarding nudge shown on the home page until a staff member
// either uploads a picture or dismisses it. Uses localStorage rather than a
// database column since "did they see this" isn't data anyone else needs.
function AvatarOnboardingPrompt({
  staff,
  onChange,
}: {
  staff: Staff;
  onChange: (staff: Staff) => void;
}) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dismissed, setDismissed] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(dismissedKey(staff.id)) === "1");
    } catch {
      setDismissed(false);
    }
  }, [staff.id]);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(dismissedKey(staff.id), "1");
    } catch {
      // localStorage may be unavailable (private browsing) — dismissing
      // just won't persist across reloads, which is fine.
    }
  }

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/portal/me/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.push({ message: data.error ?? "Couldn't upload that image", tone: "error" });
        return;
      }
      onChange({ ...staff, avatar_url: data.avatar_url });
      dismiss();
      toast.push({ message: "Profile picture updated", tone: "success" });
    } finally {
      setBusy(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-destiny-orange/20 bg-destiny-orange/5 p-5">
      <div>
        <p className="font-bold text-destiny-grey">Add a profile picture</p>
        <p className="mt-0.5 text-sm text-destiny-grey/60">
          Help your team recognise you around the portal.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Uploading…" : "Add picture"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full px-4 py-2.5 text-sm font-bold text-destiny-grey/50 transition hover:text-destiny-grey"
        >
          Skip for now
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleSelect}
        />
      </div>
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
