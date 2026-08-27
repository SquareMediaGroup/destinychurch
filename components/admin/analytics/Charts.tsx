"use client";

// Two small hand-rolled charts for /admin/analytics.
//
// No charting library: none exists anywhere in this project today, and the
// codebase deliberately avoids a dependency it can write itself (see the note
// on clsx/tailwind-merge at the top of lib/cn.ts). Both shapes here are a
// couple of dozen lines of inline SVG — colour comes from `currentColor` plus
// a Tailwind text-* class, so the brand hex in app/globals.css stays the only
// copy of it anywhere.

export interface DayPoint {
  day: string;
  events: number;
}

/**
 * A daily bar chart. Columns, not a line, because the number a church actually
 * asks about is "was Sunday a spike" — a day is a discrete thing that either
 * did or didn't happen, not a continuous quantity worth smoothing between.
 */
export function DayChart({
  points,
  className = "text-destiny-orange",
}: {
  points: DayPoint[];
  className?: string;
}) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-destiny-grey/40">No data for this range.</p>;
  }

  const max = Math.max(1, ...points.map((p) => p.events));
  const width = 100 / points.length;
  const total = points.reduce((sum, p) => sum + p.events, 0);

  return (
    <figure>
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className={`h-36 w-full ${className}`}
        role="img"
        aria-label={`${total} events across ${points.length} day${points.length === 1 ? "" : "s"}`}
      >
        {points.map((p, i) => {
          const h = (p.events / max) * 36;
          return (
            <rect
              key={p.day}
              x={i * width + width * 0.15}
              y={40 - h}
              width={Math.max(width * 0.7, 0.4)}
              height={h || 0.4}
              rx={0.6}
              fill="currentColor"
              className="transition-opacity hover:opacity-70"
            >
              <title>{`${formatDay(p.day)} — ${p.events} event${p.events === 1 ? "" : "s"}`}</title>
            </rect>
          );
        })}
        <line
          x1="0"
          y1="39.8"
          x2="100"
          y2="39.8"
          stroke="currentColor"
          strokeWidth="0.3"
          className="text-destiny-grey/15"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Same numbers, for a screen reader and for anyone who'd rather read
          them than eyeball a bar chart. */}
      <table className="sr-only">
        <caption>Events per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Events</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <td>{formatDay(p.day)}</td>
              <td>{p.events}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Small secondary figure shown right-aligned, e.g. a percentage or a share. */
  hint?: string;
}

/**
 * A ranked breakdown — top countries, referrers, devices. Plain proportional
 * divs rather than SVG: this is a table with a visual cue, not a plot, and
 * text truncation, wrapping and focus rings are things a div does for free
 * that an SVG <text> element makes you build by hand.
 */
export function BarRows({
  rows,
  emptyLabel = "Nothing here yet",
  barClassName = "bg-destiny-orange/70",
}: {
  rows: BarRow[];
  emptyLabel?: string;
  barClassName?: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-destiny-grey/40">{emptyLabel}</p>;
  }

  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.key} className="relative">
          <div
            aria-hidden
            className={`absolute inset-y-0 left-0 rounded-md ${barClassName}`}
            style={{ width: `${Math.max((row.value / max) * 100, 3)}%` }}
          />
          <div className="relative flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5">
            <span className="min-w-0 truncate text-sm font-bold text-destiny-grey">
              {row.label}
            </span>
            <span className="shrink-0 text-xs font-bold tabular-nums text-destiny-grey/60">
              {row.value.toLocaleString("en-GB")}
              {row.hint && <span className="ml-1.5 text-destiny-grey/35">{row.hint}</span>}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** "27 Aug" from a YYYY-MM-DD bucket. */
function formatDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}
