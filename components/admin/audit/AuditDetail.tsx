"use client";

// One entry, in full — the "deep detail when not using AI" half of /admin/audit.
//
// The list answers "who did what". This answers "what exactly did they change",
// which needs the things a summary sentence can't carry: the field-by-field
// before and after, who they were at the time (roles are snapshotted, so this
// is what they held *then*, not now), and the request itself — method, path, IP,
// browser. All of it is already on the row; the job here is only to lay it out
// so it can be read at a glance and copied out when it can't.

import { useState } from "react";
import { Badge, Modal, cardClass, ghostBtn } from "@/components/admin/AdminUI";
import { roleLabel } from "@/lib/adminRoles";
import {
  actionLabel,
  actionTone,
  fieldLabel,
  formatValue,
  fullTimestamp,
  relativeTime,
  sectionIcon,
  sectionLabel,
  type AuditEntry,
} from "@/lib/audit";

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-destiny-grey/40">
        {label}
      </p>
      <div className="break-words text-sm text-destiny-grey">{children}</div>
    </div>
  );
}

/**
 * A single before → after pair.
 *
 * Long values (a post body, a block of JSON) get their own row rather than
 * sitting in a table cell: side-by-side columns turn a paragraph into a
 * one-word-per-line ribbon, which is the least readable possible shape for the
 * thing you opened this panel to read.
 */
function Change({ field, from, to }: { field: string; from: unknown; to: unknown }) {
  const fromText = formatValue(from);
  const toText = formatValue(to);
  const long = fromText.length > 80 || toText.length > 80;

  if (long) {
    return (
      <div className="border-t border-black/5 px-4 py-3 first:border-t-0">
        <p className="mb-2 text-xs font-bold text-destiny-grey">{fieldLabel(field)}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl bg-destiny-red/5 p-2.5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-destiny-red/70">
              Before
            </p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-destiny-grey/70">
              {fromText}
            </pre>
          </div>
          <div className="rounded-xl bg-destiny-green/5 p-2.5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-destiny-green/70">
              After
            </p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-destiny-grey">
              {toText}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.2fr)] items-start gap-3 border-t border-black/5 px-4 py-2.5 text-sm first:border-t-0">
      <p className="font-bold text-destiny-grey">{fieldLabel(field)}</p>
      <p className="break-words text-destiny-grey/45 line-through decoration-destiny-grey/25">
        {fromText}
      </p>
      <p className="break-words font-medium text-destiny-grey">{toText}</p>
    </div>
  );
}

export function AuditDetail({
  entry,
  onClose,
  onFilterActor,
  onFilterEntity,
}: {
  entry: AuditEntry;
  onClose: () => void;
  /** "Everything else this person did" — one click from any entry. */
  onFilterActor: (email: string) => void;
  /** "The whole history of this one thing" — the other question people ask. */
  onFilterEntity: (entity: string, entityId: string | null) => void;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const changes = Object.entries(entry.changes ?? {});
  const metadata = Object.entries(entry.metadata ?? {});

  return (
    <Modal title="Activity detail" size="lg" onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={actionTone(entry.action)}>{actionLabel(entry.action)}</Badge>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-destiny-grey/45">
              <span className="material-symbols-rounded text-sm">
                {sectionIcon(entry.section)}
              </span>
              {sectionLabel(entry.section)}
            </span>
          </div>
          <p className="text-base font-bold leading-snug text-destiny-grey">
            {entry.summary}
          </p>
        </div>

        <div className={`${cardClass} grid gap-4 p-4 sm:grid-cols-2`}>
          <MetaRow label="When">
            {fullTimestamp(entry.created_at)}
            <span className="ml-1.5 text-destiny-grey/45">
              ({relativeTime(entry.created_at)})
            </span>
          </MetaRow>

          <MetaRow label="Who">
            {entry.actor_email ? (
              <button
                type="button"
                onClick={() => onFilterActor(entry.actor_email!)}
                className="font-bold text-destiny-orange transition hover:brightness-110"
              >
                {entry.actor_email}
              </button>
            ) : (
              <span className="text-destiny-grey/50">System</span>
            )}
            {entry.actor_roles.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {/* Snapshotted at the time, not read live — these are the roles
                    they held when they did this, not the ones they hold now. */}
                {entry.actor_roles.map((role) => (
                  <span
                    key={role}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      role === "super_admin"
                        ? "bg-destiny-orange/10 text-destiny-orange"
                        : "bg-black/5 text-destiny-grey/60"
                    }`}
                  >
                    {roleLabel(role)}
                  </span>
                ))}
              </div>
            )}
          </MetaRow>

          <MetaRow label="What was changed">
            <button
              type="button"
              onClick={() => onFilterEntity(entry.entity, entry.entity_id)}
              className="text-left font-medium text-destiny-orange transition hover:brightness-110"
            >
              {entry.entity_label ?? entry.entity}
            </button>
            <span className="ml-1.5 text-xs text-destiny-grey/45">{entry.entity}</span>
          </MetaRow>

          <MetaRow label="Reference">
            <span className="font-mono text-xs text-destiny-grey/60">
              {entry.entity_id ?? "—"}
            </span>
          </MetaRow>

          <MetaRow label="Request">
            <span className="font-mono text-xs text-destiny-grey/60">
              {entry.method ?? "—"} {entry.path ?? ""}
            </span>
          </MetaRow>

          <MetaRow label="From">
            <span className="font-mono text-xs text-destiny-grey/60">
              {entry.ip ?? "—"}
            </span>
          </MetaRow>

          {entry.user_agent && (
            <div className="sm:col-span-2">
              <MetaRow label="Browser">
                <span className="text-xs text-destiny-grey/50">{entry.user_agent}</span>
              </MetaRow>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-destiny-grey/45">
            What changed
          </p>
          {changes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-center text-sm text-destiny-grey/45">
              No field-level changes were recorded for this entry.
            </p>
          ) : (
            <div className={`overflow-hidden ${cardClass}`}>
              {changes.map(([field, change]) => (
                <Change key={field} field={field} from={change.from} to={change.to} />
              ))}
            </div>
          )}
        </div>

        {metadata.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-destiny-grey/45">
              Extra detail
            </p>
            <div className={`overflow-hidden ${cardClass}`}>
              {metadata.map(([key, value]) => (
                <div
                  key={key}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 border-t border-black/5 px-4 py-2.5 text-sm first:border-t-0"
                >
                  <p className="font-bold text-destiny-grey">{fieldLabel(key)}</p>
                  <p className="break-words text-destiny-grey/70">{formatValue(value)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* The escape hatch: whatever the layout above didn't think to show,
              the row itself still has. */}
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs font-bold text-destiny-grey/45 transition hover:text-destiny-grey"
          >
            {showRaw ? "Hide" : "Show"} raw entry
          </button>
          <button type="button" onClick={onClose} className={ghostBtn}>
            Close
          </button>
        </div>

        {showRaw && (
          <pre className="max-h-72 overflow-auto rounded-2xl bg-[#f5f7fa] p-4 text-[11px] leading-relaxed text-destiny-grey/70">
            {JSON.stringify(entry, null, 2)}
          </pre>
        )}
      </div>
    </Modal>
  );
}
