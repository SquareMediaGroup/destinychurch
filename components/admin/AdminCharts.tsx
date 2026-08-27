"use client";

// The admin's data-visualisation kit — kept separate from AdminUI.tsx, which
// is controls and layout (buttons, cards, modals). This is the other half:
// small, hand-rolled charts for the handful of places the admin actually has
// a real time series to show.
//
// No charting library. The only genuine time-series in the app is the weekly
// audit_reports.stats history and a day-bucketed count of the audit log — a
// few dozen points at most, ever — which a 20-line inline SVG covers just as
// well as a dependency would, and matches the codebase's existing taste for
// hand-rolled visuals (the rotating conic-gradient border on Smart Search,
// .search-glow in app/globals.css, is hand-rolled too).

/* ── Sparkline ─────────────────────────────────────────────────────────────── */

const TONE_STROKE: Record<string, string> = {
  orange: "var(--color-destiny-orange-500)",
  red: "var(--color-destiny-red-500)",
  blue: "var(--color-destiny-blue-500)",
  green: "var(--color-destiny-green-500)",
  purple: "var(--color-destiny-purple-500)",
  grey: "var(--color-destiny-grey-400)",
};

/**
 * A minimal line chart with no axes, labels or tooltip — the point is the
 * shape, not the numbers. Where the actual value matters it sits in text next
 * to the sparkline (see the reports list and the audit page), so this never
 * has to double as the source of truth.
 */
export function Sparkline({
  values,
  tone = "orange",
  width = 120,
  height = 32,
  className = "",
}: {
  values: number[];
  tone?: keyof typeof TONE_STROKE;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) {
    // A single point (or none) has no shape to draw — a flat mid-line reads
    // as "not enough data yet" rather than a rendering glitch.
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke={TONE_STROKE[tone]}
          strokeWidth={1.5}
          strokeDasharray="3 3"
          opacity={0.3}
        />
      </svg>
    );
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  // A little vertical padding so a peak/trough doesn't touch the edge and get
  // clipped by strokeWidth.
  const pad = height * 0.12;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPath = `M0,${height} L${points.join(" L")} L${width},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Trend from ${min} to ${max}`}
    >
      <path d={areaPath} fill={TONE_STROKE[tone]} opacity={0.08} />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={TONE_STROKE[tone]}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The most recent point, picked out — the one value someone's eye goes
          looking for first ("where are we now"). */}
      <circle
        cx={width}
        cy={height - pad - ((values[values.length - 1] - min) / range) * (height - pad * 2)}
        r={2.25}
        fill={TONE_STROKE[tone]}
      />
    </svg>
  );
}

/* ── Trend chip ────────────────────────────────────────────────────────────── */

/**
 * "▲12%" / "▼4%" — reuses the same up/down/muted tone language MetricCard's
 * `chip` prop already exposed (app/admin/page.tsx) but that nothing ever
 * populated, so a new trend reads as the same design language rather than a
 * new one.
 */
export function TrendChip({
  delta,
  suffix = "",
  title,
}: {
  /** Signed change. Zero renders as "muted", not as a fake up-tick. */
  delta: number;
  /** Appended after the number, e.g. "%" or " today". */
  suffix?: string;
  title?: string;
}) {
  const tone = delta > 0 ? "up" : delta < 0 ? "down" : "muted";
  const toneClass =
    tone === "up"
      ? "bg-success/10 text-success"
      : tone === "down"
        ? "bg-danger/10 text-danger"
        : "bg-black/5 text-destiny-grey/50 dark:bg-white/10 dark:text-white/50";
  const arrow = tone === "up" ? "▲" : tone === "down" ? "▼" : "—";

  return (
    <span
      title={title}
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${toneClass}`}
    >
      {arrow} {Math.abs(delta)}
      {suffix}
    </span>
  );
}

/* ── Mini bar row ──────────────────────────────────────────────────────────── */

const BAR_COLORS = [
  "bg-destiny-orange",
  "bg-destiny-blue",
  "bg-destiny-green",
  "bg-destiny-purple",
  "bg-destiny-red",
  "bg-destiny-grey-400",
];

/**
 * A proportional row of bars for a small breakdown (by section, by action) —
 * plain flex divs, no SVG needed at this size. Longest bar first, so the
 * biggest contributor to whatever's being broken down is always the one read
 * first, left to right.
 */
export function MiniBarRow({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(...sorted.map((d) => d.value), 1);

  if (sorted.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {sorted.map((row, i) => (
        <div key={row.label} className="flex items-center gap-2">
          <p className="w-28 shrink-0 truncate text-xs font-bold text-destiny-grey/60 dark:text-white/60">
            {row.label}
          </p>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
            <div
              className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
              style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
            />
          </div>
          <p className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-destiny-grey/45 dark:text-white/45">
            {row.value}
          </p>
        </div>
      ))}
    </div>
  );
}
