"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  ErrorNote,
  PageHeader,
  PageLoading,
  Toggle,
  cardClass,
  dangerBtn,
  ghostBtn,
  inputClass,
  labelClass,
  primaryBtn,
} from "@/components/admin/AdminUI";
import DesignDeliverableUploader from "@/components/admin/DesignDeliverableUploader";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import {
  DESIGN_CATEGORY_LABELS,
  DESIGN_PRIORITY_LABELS,
  DESIGN_STATUS_LABELS,
  DESIGN_STATUS_TONE,
  driveEmbedUrl,
  fileSize,
  nextStatuses,
  ticketRef,
  transitionLabel,
  type DesignDeliverable,
  type DesignTicket,
  type DesignTicketEvent,
  type DesignTicketStatus,
} from "@/lib/designTickets";

const API = "/api/admin/design/tickets";

interface Payload {
  ticket: DesignTicket;
  deliverables: DesignDeliverable[];
  events: DesignTicketEvent[];
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DesignTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const dialog = useDialog();
  const toast = useToast();

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [noteInternal, setNoteInternal] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/${id}`);
      if (!res.ok) throw new Error("Couldn't load this ticket");
      setData(await res.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function move(to: DesignTicketStatus) {
    if (!data) return;
    let body: string | undefined;

    // Both of these need words attached, and asking for them after the fact is
    // how a ticket ends up cancelled with no explanation on the requester's page.
    if (to === "cancelled") {
      const reason = await dialog.prompt({
        title: "Cancel this request",
        message: "What should we tell them? This goes on their tracking page.",
        confirmLabel: "Cancel the request",
      });
      if (reason === null) return;
      body = reason;
    }
    if (to === "changes_requested") {
      const reason = await dialog.prompt({
        title: "Send this back for changes",
        message: "What needs changing?",
        confirmLabel: "Send back",
      });
      if (!reason) return;
      body = reason;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API}/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, body }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.push({ message: result.error ?? "Couldn't do that", tone: "error" });
        load();
        return;
      }
      toast.push({
        message: `Moved to ${DESIGN_STATUS_LABELS[to].toLowerCase()}`,
        tone: "success",
      });
      load();
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: note, is_internal: noteInternal }),
      });
      if (!res.ok) {
        const result = await res.json();
        toast.push({ message: result.error ?? "Couldn't save the note", tone: "error" });
        return;
      }
      setNote("");
      load();
    } finally {
      setBusy(false);
    }
  }

  async function removeFile(file: DesignDeliverable) {
    const ok = await dialog.confirm({
      title: "Delete this file?",
      message: `“${file.file_name}” will be removed from Playbook as well. This can't be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    const res = await fetch(`${API}/${id}/deliverables/${file.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.push({ message: "Couldn't delete that file", tone: "error" });
      return;
    }
    load();
  }

  if (loading) return <PageLoading label="Loading ticket" />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        <ErrorNote>{error || "Ticket not found"}</ErrorNote>
      </div>
    );
  }

  const { ticket, deliverables, events } = data;
  const moves = nextStatuses(ticket.status, "designer");
  const currentFiles = deliverables.filter((d) => d.revision === ticket.revision);
  const olderFiles = deliverables.filter((d) => d.revision !== ticket.revision);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
      <PageHeader
        title={ticket.title}
        subtitle={`${ticketRef(ticket.ref)} · ${DESIGN_CATEGORY_LABELS[ticket.category]}`}
        back={{ href: "/admin/design", label: "Design tickets" }}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={DESIGN_STATUS_TONE[ticket.status]}>
              {DESIGN_STATUS_LABELS[ticket.status]}
            </Badge>
            {ticket.priority === "fast_track" ? <Badge tone="orange">Fast-tracked</Badge> : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* What to do next */}
          {moves.length > 0 ? (
            <div className={`${cardClass} p-5`}>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                What next
              </p>
              <div className="flex flex-wrap gap-2">
                {moves.map((to) => (
                  <button
                    key={to}
                    type="button"
                    disabled={busy}
                    onClick={() => move(to)}
                    className={to === "cancelled" ? dangerBtn : primaryBtn}
                  >
                    {transitionLabel(ticket.status, to)}
                  </button>
                ))}
              </div>
              {ticket.status === "in_progress" && currentFiles.length === 0 ? (
                <p className="mt-3 text-xs text-destiny-grey/50 dark:text-white/50">
                  Upload at least one file before this can be marked delivered.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* The brief */}
          <div className={`${cardClass} p-6`}>
            <h2 className="mb-4 text-sm font-bold text-destiny-grey dark:text-white">The brief</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-destiny-grey/70 dark:text-white/70">
              {ticket.brief}
            </p>
            {ticket.specs ? (
              <>
                <p className="mt-5 mb-1 text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                  Sizes and formats
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-destiny-grey/70 dark:text-white/70">
                  {ticket.specs}
                </p>
              </>
            ) : null}
          </div>

          {/* Files */}
          <div className={`${cardClass} p-6`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-destiny-grey dark:text-white">
                Deliverables
              </h2>
              {ticket.revision > 1 ? (
                <span className="text-xs text-destiny-grey/50 dark:text-white/50">
                  Round {ticket.revision}
                </span>
              ) : null}
            </div>

            {currentFiles.length > 0 ? (
              <ul className="mb-4 space-y-3">
                {currentFiles.map((file) => {
                  const embed = file.storage_kind === "link" && file.link_url
                    ? driveEmbedUrl(file.link_url)
                    : null;
                  return (
                    <li key={file.id} className="rounded-2xl bg-black/[0.03] p-3 dark:bg-white/5">
                      {embed ? (
                        <iframe
                          src={embed}
                          allow="autoplay"
                          className="mb-3 aspect-video w-full rounded-xl border-0"
                        />
                      ) : null}
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-rounded text-lg text-destiny-orange">
                          {file.storage_kind === "link" ? "smart_display" : "draft"}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-destiny-grey dark:text-white">
                            {file.file_name}
                          </span>
                          <span className="block text-xs text-destiny-grey/50 dark:text-white/50">
                            {file.storage_kind === "link"
                              ? file.link_provider === "drive"
                                ? "Google Drive link"
                                : "Playbook link"
                              : fileSize(file.size_bytes)}
                            {file.uploaded_by_email ? ` · ${file.uploaded_by_email}` : ""}
                          </span>
                        </span>
                        <a
                          href={
                            file.storage_kind === "link"
                              ? (file.link_url ?? "#")
                              : `${API}/${id}/deliverables/${file.id}/download`
                          }
                          target={file.storage_kind === "link" ? "_blank" : undefined}
                          rel={file.storage_kind === "link" ? "noreferrer" : undefined}
                          className="material-symbols-rounded text-lg text-destiny-grey/50 transition hover:text-destiny-orange dark:text-white/50"
                          title={file.storage_kind === "link" ? "Open" : "Download"}
                        >
                          {file.storage_kind === "link" ? "open_in_new" : "download"}
                        </a>
                        <button
                          type="button"
                          onClick={() => removeFile(file)}
                          className="material-symbols-rounded text-lg text-destiny-grey/50 transition hover:text-danger dark:text-white/50"
                          title="Delete"
                        >
                          delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <DesignDeliverableUploader ticketId={id} onUploaded={load} />

            {olderFiles.length > 0 ? (
              <details className="mt-5">
                <summary className="cursor-pointer text-xs font-bold text-destiny-grey/50 dark:text-white/50">
                  Earlier rounds ({olderFiles.length})
                </summary>
                <ul className="mt-3 space-y-2">
                  {olderFiles.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center gap-3 rounded-2xl bg-black/[0.02] px-4 py-2.5 dark:bg-white/[0.03]"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-destiny-grey/60 dark:text-white/60">
                        r{file.revision} · {file.file_name}
                      </span>
                      <a
                        href={
                          file.storage_kind === "link"
                            ? (file.link_url ?? "#")
                            : `${API}/${id}/deliverables/${file.id}/download`
                        }
                        target={file.storage_kind === "link" ? "_blank" : undefined}
                        rel={file.storage_kind === "link" ? "noreferrer" : undefined}
                        className="material-symbols-rounded text-base text-destiny-grey/40 transition hover:text-destiny-orange dark:text-white/40"
                        title={file.storage_kind === "link" ? "Open" : "Download"}
                      >
                        {file.storage_kind === "link" ? "open_in_new" : "download"}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>

          {/* Thread */}
          <div className={`${cardClass} p-6`}>
            <h2 className="mb-4 text-sm font-bold text-destiny-grey dark:text-white">Activity</h2>
            <ol className="mb-6 space-y-4">
              {events.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <div
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      event.is_internal ? "bg-destiny-grey/30" : "bg-destiny-orange"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-destiny-grey dark:text-white">
                      {event.to_status
                        ? DESIGN_STATUS_LABELS[event.to_status]
                        : event.kind === "change_request"
                          ? "Changes requested"
                          : "Note"}
                      {event.actor_name ? (
                        <span className="font-normal text-destiny-grey/50 dark:text-white/50">
                          {" "}
                          · {event.actor_name}
                        </span>
                      ) : null}
                      {event.is_internal ? (
                        <span className="ml-2 rounded-full bg-black/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destiny-grey/60 dark:bg-white/10 dark:text-white/60">
                          Internal
                        </span>
                      ) : null}
                    </p>
                    {event.body ? (
                      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-destiny-grey/60 dark:text-white/60">
                        {event.body}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-destiny-grey/40 dark:text-white/40">
                      {when(event.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="border-t border-black/5 pt-5 dark:border-white/8">
              <label className={labelClass} htmlFor="note">
                Add a note
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                placeholder="Anything worth recording against this ticket."
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <Toggle
                  checked={noteInternal}
                  onChange={setNoteInternal}
                  label="Internal only"
                />
                <button
                  type="button"
                  disabled={busy || !note.trim()}
                  onClick={addNote}
                  className={ghostBtn}
                >
                  Add note
                </button>
              </div>
              <p className="mt-2 text-xs text-destiny-grey/40 dark:text-white/40">
                {noteInternal
                  ? "Only the design team will see this."
                  : "This will show on the requester's tracking page."}
              </p>
            </div>
          </div>
        </div>

        {/* Who asked */}
        <aside className="space-y-6">
          <div className={`${cardClass} p-6`}>
            <h2 className="mb-4 text-sm font-bold text-destiny-grey dark:text-white">
              Who asked
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                  Name
                </dt>
                <dd className="text-destiny-grey dark:text-white">{ticket.requester_name}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                  Email
                </dt>
                <dd className="break-all">
                  <a
                    href={`mailto:${ticket.requester_email}`}
                    className="text-destiny-orange hover:underline"
                  >
                    {ticket.requester_email}
                  </a>
                </dd>
              </div>
              {ticket.requester_phone ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                    Phone
                  </dt>
                  <dd className="text-destiny-grey dark:text-white">
                    {ticket.requester_phone}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                  Priority
                </dt>
                <dd className="text-destiny-grey dark:text-white">
                  {DESIGN_PRIORITY_LABELS[ticket.priority]}
                  {ticket.requester_verified ? (
                    <span className="text-destiny-grey/50 dark:text-white/50">
                      {" "}
                      · signed in
                    </span>
                  ) : null}
                </dd>
              </div>
              {ticket.needed_by ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                    Needed by
                  </dt>
                  <dd className="text-destiny-grey dark:text-white">
                    {new Date(`${ticket.needed_by}T00:00:00`).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                  Raised
                </dt>
                <dd className="text-destiny-grey dark:text-white">{when(ticket.created_at)}</dd>
              </div>
              {ticket.assignee_name ? (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-destiny-grey/40 dark:text-white/40">
                    Owner
                  </dt>
                  <dd className="text-destiny-grey dark:text-white">{ticket.assignee_name}</dd>
                </div>
              ) : null}
            </dl>

            <a
              href={`/design-request/${ticket.share_token}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex items-center gap-2 text-xs font-bold text-destiny-orange hover:underline"
            >
              <span className="material-symbols-rounded text-base">visibility</span>
              See what they see
            </a>
          </div>

          <div className={`${cardClass} p-6`}>
            <h2 className="mb-3 text-sm font-bold text-destiny-grey dark:text-white">
              Danger zone
            </h2>
            <p className="mb-4 text-xs leading-relaxed text-destiny-grey/50 dark:text-white/50">
              Deleting removes the ticket, its history and its uploaded files. Cancelling is
              almost always the better option.
            </p>
            <button
              type="button"
              className={dangerBtn}
              onClick={async () => {
                const ok = await dialog.confirm({
                  title: "Delete this ticket?",
                  message:
                    "The ticket, its history and every uploaded file will be removed permanently.",
                  confirmLabel: "Delete",
                  tone: "danger",
                });
                if (!ok) return;
                const res = await fetch(`${API}/${id}`, { method: "DELETE" });
                if (!res.ok) {
                  toast.push({ message: "Couldn't delete it", tone: "error" });
                  return;
                }
                router.push("/admin/design");
              }}
            >
              Delete ticket
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
