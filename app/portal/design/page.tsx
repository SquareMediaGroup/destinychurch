"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DESIGN_CATEGORY_LABELS,
  DESIGN_STATUS_LABELS,
  ticketRef,
  type DesignTicketCategory,
  type DesignTicketStatus,
} from "@/lib/designTickets";

interface PortalTicket {
  id: string;
  ref: number;
  title: string;
  category: DesignTicketCategory;
  status: DesignTicketStatus;
  revision: number;
  priority: "normal" | "fast_track";
  needed_by: string | null;
  share_token: string;
  assignee_name: string | null;
  created_at: string;
}

// /portal is light-only, like the rest of the staff portal — dark mode is an
// /admin feature.
const STATUS_COLOR: Record<DesignTicketStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  claimed: "bg-purple-100 text-purple-700",
  in_progress: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  changes_requested: "bg-red-100 text-red-700",
  closed: "bg-black/8 text-destiny-grey/70",
  cancelled: "bg-black/8 text-destiny-grey/70",
};

export default function PortalDesignPage() {
  const [tickets, setTickets] = useState<PortalTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/portal/design")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTickets)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-destiny-grey">My design requests</h1>
          <p className="mt-1 text-sm text-destiny-grey/60">
            Everything you&apos;ve asked the design team for.
          </p>
        </div>
        <Link
          href="/design-request"
          className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
        >
          New request
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-destiny-grey/50">Loading…</p>
      ) : tickets.length === 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white p-10 text-center">
          <span className="material-symbols-rounded mb-2 block text-4xl text-destiny-grey/30">
            draw
          </span>
          <p className="font-bold text-destiny-grey">Nothing yet</p>
          <p className="mt-1 text-sm text-destiny-grey/60">
            When you ask the design team for something, it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/design-request/${ticket.share_token}`}
                className="block rounded-3xl border border-black/5 bg-white p-5 transition hover:border-destiny-orange/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-destiny-orange">
                    {ticketRef(ticket.ref)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLOR[ticket.status]}`}
                  >
                    {DESIGN_STATUS_LABELS[ticket.status]}
                  </span>
                  {ticket.priority === "fast_track" ? (
                    <span className="rounded-full bg-destiny-orange/10 px-2.5 py-0.5 text-xs font-bold text-destiny-orange">
                      Fast-tracked
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 font-bold text-destiny-grey">{ticket.title}</p>
                <p className="mt-0.5 text-xs text-destiny-grey/50">
                  {DESIGN_CATEGORY_LABELS[ticket.category]}
                  {ticket.assignee_name ? ` · ${ticket.assignee_name}` : ""}
                  {ticket.revision > 1 ? ` · round ${ticket.revision}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
