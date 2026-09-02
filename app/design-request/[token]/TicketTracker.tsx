"use client";

import { useState } from "react";
import {
  DESIGN_STATUS_BLURB,
  DESIGN_STATUS_LABELS,
  DESIGN_CATEGORY_LABELS,
  MAX_CHANGE_REQUESTS,
  canTransition,
  driveEmbedUrl,
  fileSize,
  ticketRef,
  type DesignTicketStatus,
  type RequesterTicketView,
} from "@/lib/designTickets";

const STATUS_COLOR: Record<DesignTicketStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  claimed: "bg-purple-100 text-purple-700",
  in_progress: "bg-orange-100 text-orange-700",
  delivered: "bg-green-100 text-green-700",
  changes_requested: "bg-red-100 text-red-700",
  closed: "bg-black/8 text-destiny-grey/70",
  cancelled: "bg-black/8 text-destiny-grey/70",
};

function when(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TicketTracker({
  token,
  initial,
}: {
  token: string;
  initial: RequesterTicketView;
}) {
  const [view, setView] = useState(initial);
  const [changeNote, setChangeNote] = useState("");
  const [showChangeBox, setShowChangeBox] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canRequestChanges =
    canTransition(view.status, "changes_requested", "requester") &&
    view.change_requests_used < MAX_CHANGE_REQUESTS;
  const canClose = canTransition(view.status, "closed", "requester");

  // Grouped so an earlier round stays available rather than being replaced —
  // the point of a revision is that you can still see what you approved before.
  const revisions = Array.from(new Set(view.deliverables.map((d) => d.revision))).sort(
    (a, b) => b - a,
  );

  async function move(to: DesignTicketStatus, body?: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/design-request/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setView(data);
      setShowChangeBox(false);
      setChangeNote("");
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-destiny-orange">{ticketRef(view.ref)}</span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_COLOR[view.status]}`}
          >
            {DESIGN_STATUS_LABELS[view.status]}
          </span>
          {view.revision > 1 ? (
            <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-destiny-grey/60">
              Round {view.revision}
            </span>
          ) : null}
        </div>

        <h1 className="mt-4 text-3xl font-black text-destiny-grey">{view.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-destiny-grey/60">
          {DESIGN_STATUS_BLURB[view.status]}
        </p>

        {view.designer_name && view.status !== "open" ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-destiny-grey/70">
            <span className="material-symbols-rounded text-lg text-destiny-orange">person</span>
            <span>
              <span className="font-bold text-destiny-grey">{view.designer_name}</span> is looking
              after this
            </span>
          </p>
        ) : null}

        {view.resolution_note ? (
          <p className="mt-4 rounded-2xl bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey/70">
            {view.resolution_note}
          </p>
        ) : null}
      </div>

      {/* Files */}
      {view.deliverables.length > 0 ? (
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <h2 className="mb-4 text-lg font-black text-destiny-grey">Your files</h2>
          <div className="space-y-6">
            {revisions.map((rev) => (
              <div key={rev}>
                {revisions.length > 1 ? (
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
                    {rev === view.revision ? "Latest" : `Round ${rev}`}
                  </p>
                ) : null}
                <div className="space-y-3">
                  {view.deliverables
                    .filter((d) => d.revision === rev)
                    .map((file) => {
                      const embed =
                        file.storage_kind === "link" && file.link_url
                          ? driveEmbedUrl(file.link_url)
                          : null;
                      const href =
                        file.storage_kind === "link"
                          ? (file.link_url ?? "#")
                          : `/api/design-request/${token}/deliverables/${file.id}/download`;
                      return (
                        <div key={file.id}>
                          {embed ? (
                            <iframe
                              src={embed}
                              allow="autoplay"
                              className="mb-2 aspect-video w-full rounded-2xl border-0"
                            />
                          ) : null}
                          <a
                            href={href}
                            target={file.storage_kind === "link" ? "_blank" : undefined}
                            rel={file.storage_kind === "link" ? "noreferrer" : undefined}
                            className="flex items-center gap-3 rounded-2xl bg-[#f5f7fa] px-4 py-3 transition hover:bg-black/8"
                          >
                            <span className="material-symbols-rounded text-xl text-destiny-orange">
                              {file.storage_kind === "link" ? "open_in_new" : "download"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-bold text-destiny-grey">
                                {file.file_name}
                              </span>
                              {file.storage_kind !== "link" && file.size_bytes ? (
                                <span className="block text-xs text-destiny-grey/50">
                                  {fileSize(file.size_bytes)}
                                </span>
                              ) : null}
                            </span>
                          </a>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Actions */}
      {canRequestChanges || canClose ? (
        <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <h2 className="mb-1 text-lg font-black text-destiny-grey">How does it look?</h2>
          <p className="mb-5 text-sm text-destiny-grey/60">
            If it&apos;s right, close it off. If not, tell us what to change.
          </p>

          {error ? (
            <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          {showChangeBox ? (
            <div className="space-y-3">
              <textarea
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                rows={4}
                maxLength={2000}
                autoFocus
                placeholder="What needs changing? The more specific, the fewer rounds this takes."
                className="w-full resize-none rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={busy || !changeNote.trim()}
                  onClick={() => move("changes_requested", changeNote)}
                  className="rounded-full bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Send these changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowChangeBox(false)}
                  className="rounded-full bg-black/5 px-6 py-2.5 text-sm font-bold text-destiny-grey transition hover:bg-black/10"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {canClose ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => move("closed")}
                  className="rounded-full bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
                >
                  This is perfect, close it
                </button>
              ) : null}
              {canRequestChanges ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowChangeBox(true)}
                  className="rounded-full bg-black/5 px-6 py-2.5 text-sm font-bold text-destiny-grey transition hover:bg-black/10"
                >
                  Ask for changes
                </button>
              ) : null}
            </div>
          )}

          {view.change_requests_used >= MAX_CHANGE_REQUESTS ? (
            <p className="mt-4 text-sm text-destiny-grey/60">
              This one has been round a few times — it&apos;s probably quicker to speak to the
              design team directly now.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* The brief, as submitted */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-lg font-black text-destiny-grey">What you asked for</h2>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
              Brief
            </dt>
            <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-destiny-grey/70">
              {view.brief}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
              Type
            </dt>
            <dd className="mt-1 text-destiny-grey/70">
              {DESIGN_CATEGORY_LABELS[view.category]}
            </dd>
          </div>
          {view.needed_by ? (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
                Needed by
              </dt>
              <dd className="mt-1 text-destiny-grey/70">{when(view.needed_by)}</dd>
            </div>
          ) : null}
          {view.specs ? (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40">
                Sizes and formats
              </dt>
              <dd className="mt-1 whitespace-pre-wrap leading-relaxed text-destiny-grey/70">
                {view.specs}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* History */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
        <h2 className="mb-5 text-lg font-black text-destiny-grey">What&apos;s happened</h2>
        <ol className="space-y-4">
          {view.events.map((event) => (
            <li key={event.id} className="flex gap-4">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-destiny-orange" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-destiny-grey">
                  {event.to_status
                    ? DESIGN_STATUS_LABELS[event.to_status]
                    : event.kind === "change_request"
                      ? "Changes requested"
                      : "Note"}
                  {event.actor_name ? (
                    <span className="font-normal text-destiny-grey/50">
                      {" "}
                      · {event.actor_name}
                    </span>
                  ) : null}
                </p>
                {event.body ? (
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-destiny-grey/60">
                    {event.body}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs text-destiny-grey/40">{when(event.created_at)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="pb-8 text-center text-xs text-destiny-grey/40">
        Keep this link — it&apos;s how you get back to your files. Requested by{" "}
        {view.requester_name} on {when(view.created_at)}.
      </p>
    </div>
  );
}
