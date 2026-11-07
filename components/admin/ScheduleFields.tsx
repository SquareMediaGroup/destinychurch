"use client";

// "Show from" / "Hide after" for anything with a starts_at / ends_at window
// (the site banner and popup). Values in and out are ISO strings or null; the
// inputs are the browser's local time, which for church staff is UK time.

import { inputClass, labelClass } from "./adminTokens";

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function ScheduleFields({
  startsAt,
  endsAt,
  onChange,
  noun = "it",
}: {
  startsAt: string | null;
  endsAt: string | null;
  onChange: (next: { starts_at: string | null; ends_at: string | null }) => void;
  /** What's being scheduled, for the hint: "the banner". */
  noun?: string;
}) {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="schedule-starts">
            Show from <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="schedule-starts"
            type="datetime-local"
            value={toLocalInput(startsAt)}
            onChange={(e) => onChange({ starts_at: fromLocalInput(e.target.value), ends_at: endsAt })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="schedule-ends">
            Hide after <span className="font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input
            id="schedule-ends"
            type="datetime-local"
            value={toLocalInput(endsAt)}
            onChange={(e) => onChange({ starts_at: startsAt, ends_at: fromLocalInput(e.target.value) })}
            className={inputClass}
          />
        </div>
      </div>
      <p className="mt-1.5 text-xs text-destiny-grey/45 dark:text-white/45">
        Leave both empty to show {noun} for as long as it&apos;s switched on. With times set, {noun} appears and
        disappears by itself.
      </p>
    </div>
  );
}
