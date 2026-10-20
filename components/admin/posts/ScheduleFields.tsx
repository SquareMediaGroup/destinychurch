"use client";

import { FieldShell, fieldInputClass } from "@/components/admin/blocks/fields/BasicFields";
import type { PostFields } from "@/lib/posts";

/** ISO timestamp → the local "YYYY-MM-DDTHH:mm" a datetime-local input wants. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The input's local time back to ISO, or null when cleared. */
function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * When the page goes live and comes down. Both optional. Applies once the page
 * is published: a published page with a future go-live time shows as
 * Scheduled, and one past its take-down time stops being served by itself.
 */
export function ScheduleFields({
  form,
  set,
}: {
  form: PostFields;
  set: <K extends keyof PostFields>(key: K, value: PostFields[K]) => void;
}) {
  const badOrder =
    form.publish_from && form.publish_until && new Date(form.publish_until) <= new Date(form.publish_from);
  return (
    <FieldShell
      label="Schedule"
      help="Optional. Publish the page and it goes live and comes down at these times on its own."
    >
      <div className="grid gap-2">
        {(
          [
            ["publish_from", "Go live"],
            ["publish_until", "Take down"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs font-bold text-destiny-grey/60 dark:text-white/60">{label}</span>
            <input
              type="datetime-local"
              className={fieldInputClass}
              value={toLocalInput(form[key])}
              onChange={(e) => set(key, fromLocalInput(e.target.value))}
            />
            {form[key] && (
              <button
                type="button"
                aria-label={`Clear ${label.toLowerCase()} time`}
                onClick={() => set(key, null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-destiny-grey/40 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:text-white/40 dark:hover:text-white"
              >
                <span className="material-symbols-rounded text-lg" aria-hidden="true">close</span>
              </button>
            )}
          </label>
        ))}
      </div>
      {badOrder && (
        <p className="mt-1.5 text-xs font-medium text-destiny-red">The take-down time must be after the go-live time.</p>
      )}
    </FieldShell>
  );
}
