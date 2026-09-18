import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A small status or category pill.
 *
 * 34 hand-rolled versions, already drifting apart inside single features —
 * `app/jobs/page.tsx` tags a listing with `bg-destiny-orange/10` while
 * `app/jobs/[slug]/page.tsx` renders the same tag at `/20`, so a job's badge
 * changes shade when you open it.
 *
 * Tones are semantic rather than chromatic: `success`, `warning`, `danger` and
 * `info` map onto the `--color-*-bg` / `--color-*-fg` pairs already in
 * globals.css, which exist precisely so "this succeeded" stops being spelled as
 * "this is green" at each call site.
 */

const TONES = {
  neutral: "bg-destiny-grey/10 text-destiny-grey",
  accent: "bg-destiny-orange/10 text-destiny-orange-700",
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-danger-bg text-danger-fg",
  info: "bg-info-bg text-info-fg",
  /** For badges sitting on photography or a dark band. */
  onDark: "bg-white/15 text-white backdrop-blur-sm",
} as const;

export type BadgeTone = keyof typeof TONES;

export default function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.08em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
