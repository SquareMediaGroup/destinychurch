"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  EmptyState,
  ErrorNote,
  FilterChips,
  ListToolbar,
  PageHeader,
  SortHeader,
  TableSkeleton,
  cardClass,
  primaryBtn,
} from "@/components/admin/AdminUI";
import { useAdminList } from "@/lib/useAdminList";
import { useAdminSession } from "@/lib/useAdminSession";
import { useToast } from "@/components/ToastProvider";
import {
  DESIGN_CATEGORY_LABELS,
  DESIGN_STATUS_LABELS,
  DESIGN_STATUS_ORDER,
  DESIGN_STATUS_TONE,
  OPEN_STATUSES,
  ticketRef,
  type DesignTicket,
  type DesignTicketStatus,
} from "@/lib/designTickets";

const API = "/api/admin/design/tickets";

type QueueTicket = DesignTicket & { deliverable_count: number };

function DesignQueue() {
  const [tickets, setTickets] = useState<QueueTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [claiming, setClaiming] = useState<string | null>(null);
  const session = useAdminSession();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error("Couldn't load the queue");
      setTickets(await res.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const list = useAdminList<QueueTicket>({
    items: tickets,
    searchKeys: [
      { name: "title", weight: 0.4 },
      { name: "requester_name", weight: 0.3 },
      { name: "brief", weight: 0.2 },
      { name: "requester_email", weight: 0.1 },
    ],
    filters: [
      {
        key: "status",
        // "Needs someone" is the view a designer actually wants on opening the
        // page — a closed ticket from March is not what they came here for.
        options: [
          { value: "active", label: "Needs someone" },
          ...DESIGN_STATUS_ORDER.map((s) => ({ value: s, label: DESIGN_STATUS_LABELS[s] })),
        ],
        match: (t, value) =>
          value === "active"
            ? OPEN_STATUSES.includes(t.status)
            : t.status === (value as DesignTicketStatus),
        initial: "active",
      },
      {
        key: "priority",
        options: [{ value: "fast_track", label: "Fast-tracked" }],
        match: (t, value) => t.priority === value,
      },
      {
        key: "mine",
        options: [{ value: "mine", label: "Mine" }],
        match: (t) => Boolean(session.email) && t.assignee_email === session.email,
      },
    ],
    sorts: {
      ref: (a, b) => a.ref - b.ref,
      title: (a, b) => a.title.localeCompare(b.title),
      requester: (a, b) => a.requester_name.localeCompare(b.requester_name),
      needed_by: (a, b) => (a.needed_by ?? "9999").localeCompare(b.needed_by ?? "9999"),
      activity: (a, b) => a.last_activity_at.localeCompare(b.last_activity_at),
    },
  });

  async function claim(ticket: QueueTicket) {
    setClaiming(ticket.id);
    try {
      const res = await fetch(`${API}/${ticket.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "claimed" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.push({ message: data.error ?? "Couldn't claim it", tone: "error" });
        // Someone else got there first — reload so the row tells the truth.
        load();
        return;
      }
      toast.push({ message: `${ticketRef(ticket.ref)} is yours`, tone: "success" });
      load();
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <PageHeader
        title="Design tickets"
        subtitle="Requests from the church, and what's happening to them."
        action={
          <Link href="/design-request" target="_blank" className={primaryBtn}>
            <span className="material-symbols-rounded text-lg">open_in_new</span>
            Request form
          </Link>
        }
      />

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <ListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search by title, person or brief"
        total={list.total}
        shown={list.shown}
        noun="ticket"
        filters={
          <>
            <FilterChips
              options={list.filterOptions("status")}
              value={list.filterValues.status}
              onChange={(v) => list.setFilter("status", v)}
              label="Status"
            />
            <FilterChips
              options={list.filterOptions("priority")}
              value={list.filterValues.priority}
              onChange={(v) => list.setFilter("priority", v)}
              label="Priority"
            />
            <FilterChips
              options={list.filterOptions("mine")}
              value={list.filterValues.mine}
              onChange={(v) => list.setFilter("mine", v)}
              label="Owner"
            />
          </>
        }
      />

      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : list.visible.length === 0 ? (
        <EmptyState
          icon="draw"
          title={list.isFiltered ? "Nothing matches that" : "No design requests yet"}
          hint={
            list.isFiltered
              ? "Try a different filter or clear the search."
              : "When someone fills in the request form, it lands here."
          }
        />
      ) : (
        <div className={`overflow-x-auto ${cardClass}`}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/5 text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:border-white/8 dark:text-white/40">
              <tr>
                <SortHeader
                  label="Ref"
                  field="ref"
                  active={list.sortField === "ref"}
                  direction={list.sortDirection}
                  onSort={list.toggleSort}
                  className="px-5 py-3"
                />
                <SortHeader
                  label="Request"
                  field="title"
                  active={list.sortField === "title"}
                  direction={list.sortDirection}
                  onSort={list.toggleSort}
                  className="px-5 py-3"
                />
                <SortHeader
                  label="From"
                  field="requester"
                  active={list.sortField === "requester"}
                  direction={list.sortDirection}
                  onSort={list.toggleSort}
                  className="px-5 py-3"
                />
                <SortHeader
                  label="Needed by"
                  field="needed_by"
                  active={list.sortField === "needed_by"}
                  direction={list.sortDirection}
                  onSort={list.toggleSort}
                  className="px-5 py-3"
                />
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/8">
              {list.visible.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="transition hover:bg-black/[0.02] dark:hover:bg-white/5"
                >
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={`/admin/design/${ticket.id}`}
                      className="font-bold text-destiny-orange"
                    >
                      {ticketRef(ticket.ref)}
                    </Link>
                    {ticket.priority === "fast_track" ? (
                      <span
                        className="material-symbols-rounded ml-1 align-middle text-sm text-destiny-orange"
                        title="Fast-tracked"
                      >
                        bolt
                      </span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Link
                      href={`/admin/design/${ticket.id}`}
                      className="font-bold text-destiny-grey dark:text-white"
                    >
                      {ticket.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-destiny-grey/50 dark:text-white/50">
                      {DESIGN_CATEGORY_LABELS[ticket.category]}
                      {ticket.deliverable_count > 0
                        ? ` · ${ticket.deliverable_count} file${ticket.deliverable_count === 1 ? "" : "s"}`
                        : ""}
                      {ticket.revision > 1 ? ` · round ${ticket.revision}` : ""}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top">
                    <p className="text-destiny-grey dark:text-white">{ticket.requester_name}</p>
                    <p className="text-xs text-destiny-grey/50 dark:text-white/50">
                      {ticket.requester_email}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-top text-destiny-grey/70 dark:text-white/70">
                    {ticket.needed_by
                      ? new Date(`${ticket.needed_by}T00:00:00`).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <Badge tone={DESIGN_STATUS_TONE[ticket.status]}>
                      {DESIGN_STATUS_LABELS[ticket.status]}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right align-top">
                    {ticket.status === "open" ? (
                      <button
                        type="button"
                        disabled={claiming === ticket.id}
                        onClick={() => claim(ticket)}
                        className="rounded-full bg-destiny-orange px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                      >
                        {claiming === ticket.id ? "Claiming…" : "Claim"}
                      </button>
                    ) : (
                      <span className="text-xs text-destiny-grey/60 dark:text-white/60">
                        {ticket.assignee_name ?? "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function DesignQueuePage() {
  // useAdminList reads the query string, so it needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <DesignQueue />
    </Suspense>
  );
}
