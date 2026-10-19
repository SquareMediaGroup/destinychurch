"use client";

import { useCallback, useEffect, useState } from "react";
import { useDialog } from "@/components/DialogProvider";
import {
  Badge,
  EmptyState,
  ErrorNote,
  PageHeader,
  CardSkeleton,
  cardClass,
  ghostBtn,
  inputClass,
  labelClass,
  primaryBtn,
} from "@/components/admin/AdminUI";
import {
  INCIDENT_KINDS,
  STATUS_COMPONENTS,
  incidentKindLabel,
  type IncidentKind,
  type StatusIncident,
} from "@/lib/statusComponents";

// /admin/status — post outages, amber alerts and maintenance to
// status.destinytees.uk, then keep members posted with timeline updates.
// An outage still open after an hour emails every Site Admin
// (app/api/cron/status-outage-alerts).

const KIND_TONE: Record<IncidentKind, string> = { outage: "red", degraded: "orange", maintenance: "blue" };

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function componentName(id: string) {
  return STATUS_COMPONENTS.find((c) => c.id === id)?.name ?? id;
}

export default function StatusAdminPage() {
  const [incidents, setIncidents] = useState<StatusIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/status/incidents");
      const data = await res.json();
      if (Array.isArray(data)) setIncidents(data);
      else setError(data?.error ? `Database error: ${data.error}` : "Couldn't load incidents.");
    } catch {
      setError("Couldn't load incidents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = incidents.filter((i) => !i.resolved_at);
  const resolved = incidents.filter((i) => i.resolved_at);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        title="Status page"
        subtitle="Post outages and amber alerts on status.destinytees.uk, and keep members updated while it's fixed."
        back={{ href: "/admin", label: "Dashboard" }}
        action={
          <button className={primaryBtn} onClick={() => setShowForm((s) => !s)}>
            <span className="material-symbols-rounded text-lg" aria-hidden="true">
              {showForm ? "close" : "add"}
            </span>
            {showForm ? "Cancel" : "New incident"}
          </button>
        }
      />

      <ErrorNote>{error}</ErrorNote>

      {showForm && (
        <NewIncidentForm
          onCancel={() => setShowForm(false)}
          onCreated={async () => {
            setShowForm(false);
            await load();
          }}
          onError={setError}
        />
      )}

      {loading ? (
        <CardSkeleton count={2} />
      ) : open.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="Nothing open"
          hint="The status page shows the automated checks only. Post an incident when members need to know about a problem."
        />
      ) : (
        <div className="flex flex-col gap-5">
          {open.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} onChange={load} onError={setError} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-wider text-destiny-grey/50 dark:text-white/50">
            Resolved in the last 30 days
          </h2>
          <div className="flex flex-col gap-4">
            {resolved.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} onChange={load} onError={setError} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ComponentPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const services = [...new Set(STATUS_COMPONENTS.map((c) => c.service))];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {services.map((service) => (
        <fieldset key={service}>
          <legend className="mb-2 text-xs font-bold text-destiny-grey/60 dark:text-white/60">{service}</legend>
          <div className="flex flex-col gap-1.5">
            {STATUS_COMPONENTS.filter((c) => c.service === service).map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm text-destiny-grey dark:text-white">
                <input
                  type="checkbox"
                  checked={value.includes(c.id)}
                  onChange={(e) => onChange(e.target.checked ? [...value, c.id] : value.filter((id) => id !== c.id))}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function KindPicker({ value, onChange, name }: { value: IncidentKind; onChange: (k: IncidentKind) => void; name: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {INCIDENT_KINDS.map((k) => (
        <label
          key={k.value}
          className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-bold transition ${
            value === k.value
              ? "border-destiny-orange bg-destiny-orange/10 text-destiny-orange"
              : "border-black/10 text-destiny-grey/60 dark:border-white/10 dark:text-white/60"
          }`}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={value === k.value}
            onChange={() => onChange(k.value)}
          />
          {k.label}
        </label>
      ))}
    </div>
  );
}

function NewIncidentForm({
  onCancel,
  onCreated,
  onError,
}: {
  onCancel: () => void;
  onCreated: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<IncidentKind>("degraded");
  const [components, setComponents] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (components.length === 0) {
      onError("Pick at least one affected part.");
      return;
    }
    setSaving(true);
    onError("");
    const res = await fetch("/api/admin/status/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, kind, components, message }),
    });
    setSaving(false);
    if (res.ok) await onCreated();
    else onError((await res.json().catch(() => ({}))).error ?? "Couldn't post that incident.");
  }

  return (
    <div className={`${cardClass} mb-8 p-6`}>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-destiny-grey/50 dark:text-white/50">
        New incident
      </h2>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div>
          <span className={labelClass}>Type</span>
          <KindPicker value={kind} onChange={setKind} name="new-kind" />
          <p className="mt-2 text-xs text-destiny-grey/45 dark:text-white/45">
            Outages still open after an hour email every Site Admin.
          </p>
        </div>
        <div>
          <label className={labelClass} htmlFor="incident-title">
            Title
          </label>
          <input
            id="incident-title"
            className={inputClass}
            value={title}
            maxLength={200}
            required
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Destiny One messages are slow to send"
          />
        </div>
        <div>
          <span className={labelClass}>Affected</span>
          <ComponentPicker value={components} onChange={setComponents} />
        </div>
        <div>
          <label className={labelClass} htmlFor="incident-message">
            First update (shown to members)
          </label>
          <textarea
            id="incident-message"
            className={inputClass}
            rows={3}
            maxLength={2000}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What members will notice and what we're doing about it."
          />
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" className={ghostBtn} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className={primaryBtn} disabled={saving}>
            {saving ? "Posting…" : "Post to status page"}
          </button>
        </div>
      </form>
    </div>
  );
}

function IncidentCard({
  incident,
  onChange,
  onError,
}: {
  incident: StatusIncident;
  onChange: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const { confirm } = useDialog();
  const [update, setUpdate] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<IncidentKind>(incident.kind);
  const [components, setComponents] = useState<string[]>(incident.components);
  const isOpen = !incident.resolved_at;

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    onError("");
    const res = await fetch(`/api/admin/status/incidents/${incident.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      onError((await res.json().catch(() => ({}))).error ?? "Couldn't save that change.");
      return false;
    }
    await onChange();
    return true;
  }

  async function postUpdate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError("");
    const res = await fetch(`/api/admin/status/incidents/${incident.id}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: update }),
    });
    setBusy(false);
    if (!res.ok) {
      onError((await res.json().catch(() => ({}))).error ?? "Couldn't post that update.");
      return;
    }
    setUpdate("");
    await onChange();
  }

  async function resolve() {
    const ok = await confirm({
      title: "Resolve incident",
      message: `Mark “${incident.title}” as resolved? Post a final update first if members should know what happened.`,
      confirmLabel: "Resolve",
    });
    if (ok) await patch({ resolved: true });
  }

  return (
    <article className={`${cardClass} p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge tone={isOpen ? KIND_TONE[incident.kind] : "green"}>
              {isOpen ? incidentKindLabel(incident.kind) : "Resolved"}
            </Badge>
            <span className="text-xs text-destiny-grey/45 dark:text-white/45">
              Started {timeFormat.format(new Date(incident.started_at))}
              {incident.resolved_at && `, resolved ${timeFormat.format(new Date(incident.resolved_at))}`}
            </span>
          </div>
          <h3 className="text-lg font-bold text-destiny-grey dark:text-white">{incident.title}</h3>
          <p className="text-sm text-destiny-grey/55 dark:text-white/55">
            {incident.components.map(componentName).join(", ")}
          </p>
        </div>
        <div className="flex gap-2">
          {isOpen ? (
            <>
              <button className={ghostBtn} disabled={busy} onClick={() => setEditing((s) => !s)}>
                {editing ? "Close" : "Change"}
              </button>
              <button className={primaryBtn} disabled={busy} onClick={resolve}>
                Resolve
              </button>
            </>
          ) : (
            <button className={ghostBtn} disabled={busy} onClick={() => patch({ resolved: false })}>
              Reopen
            </button>
          )}
        </div>
      </div>

      {editing && isOpen && (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
          <KindPicker value={kind} onChange={setKind} name={`kind-${incident.id}`} />
          <ComponentPicker value={components} onChange={setComponents} />
          <div className="flex justify-end">
            <button
              className={primaryBtn}
              disabled={busy}
              onClick={async () => {
                if (await patch({ kind, components })) setEditing(false);
              }}
            >
              Save changes
            </button>
          </div>
        </div>
      )}

      <ol className="mt-5 flex flex-col gap-3 border-l-2 border-black/5 pl-4 dark:border-white/10">
        {incident.status_incident_updates.map((u) => (
          <li key={u.id}>
            <p className="text-xs font-bold text-destiny-grey/45 dark:text-white/45">
              {timeFormat.format(new Date(u.created_at))}
            </p>
            <p className="whitespace-pre-wrap text-sm text-destiny-grey dark:text-white">{u.body}</p>
          </li>
        ))}
      </ol>

      {isOpen && (
        <form onSubmit={postUpdate} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor={`update-${incident.id}`}>
            New update
          </label>
          <input
            id={`update-${incident.id}`}
            className={inputClass}
            value={update}
            maxLength={2000}
            required
            onChange={(e) => setUpdate(e.target.value)}
            placeholder="Post an update for members, e.g. Fix is being tested"
          />
          <button type="submit" className={primaryBtn} disabled={busy}>
            Post update
          </button>
        </form>
      )}
    </article>
  );
}
