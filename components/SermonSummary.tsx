 "use client";

import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import Icon from "./Icon";
import ReportIssueLauncher from "./ReportIssueLauncher";

type SermonSummaryProps = {
  summary?: string;
  sermonId?: string;
  sermonTitle?: string;
};

function normalizeSummary(summary: string) {
  const lines = summary.trim().split(/\r?\n/);

  // Prefer numbered lists (e.g., "1. Point") if present.
  const numbered: string[] = [];
  let current = "";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const numberMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberMatch) {
      if (current) numbered.push(current.trim());
      current = numberMatch[1];
      continue;
    }
    if (current) {
      current += " " + line;
    } else {
      current = line.replace(/^[•*-]\s*/, "");
    }
  }

  if (current) numbered.push(current.trim());
  if (numbered.length > 0) return numbered;

  // Fallback: split by lines/bullets.
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      return trimmed.replace(/^[•*-]\s*/, "").trim();
    })
    .filter(Boolean);
}

export default function SermonSummary({ summary, sermonId, sermonTitle }: SermonSummaryProps) {
  if (!summary) {
    return (
      <div className="rounded-xl border border-black/5 bg-destiny-grey/5 px-4 py-3 text-sm text-destiny-grey">
        AI summary is unavailable.
      </div>
    );
  }

  const slides = useMemo(() => normalizeSummary(summary), [summary]);

  if (!slides.length) {
    return (
      <div className="rounded-xl border border-black/5 bg-destiny-grey/5 px-4 py-3 text-sm text-destiny-grey">
        AI summary is unavailable.
      </div>
    );
  }

  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const total = slides.length;
  const go = (next: number) => {
    const safe = ((next % total) + total) % total;
    setIndex(safe);
  };
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? startX;
    const deltaX = endX - startX;
    const threshold = 40;
    if (Math.abs(deltaX) < threshold) return;
    if (deltaX < 0) {
      go(index + 1);
    } else {
      go(index - 1);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-destiny-orange/10 text-destiny-orange">
            <Icon name="view_carousel" size={18} />
          </span>
          <div>
            <p className="subheading text-sm text-destiny-orange">Summary</p>
            <p className="text-xs text-destiny-grey/80">
              Slide {index + 1} of {total}
            </p>
          </div>
        </div>
        {sermonId && sermonTitle ? (
          <ReportIssueLauncher
            sermonId={sermonId}
            sermonTitle={sermonTitle}
            issueType="summary"
            label="Report"
          />
        ) : null}
      </div>

      <div
        className="mt-3 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="prose prose-sm max-w-none text-[var(--foreground)] prose-p:my-0 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
          <ReactMarkdown
            components={{
              p: (props) => <p className="leading-relaxed" {...props} />,
              strong: (props) => <strong className="font-semibold" {...props} />,
              em: (props) => <em className="font-semibold" {...props} />,
              code: (props) => (
                <code className="rounded bg-[var(--surface)] px-1 py-0.5 text-[13px] text-[var(--foreground)]" {...props} />
              ),
              a: (props) => (
                <a
                  className="font-semibold text-destiny-orange underline"
                  target="_blank"
                  rel="noreferrer"
                  {...props}
                />
              ),
              ul: (props) => <ul className="ml-4 list-disc space-y-1" {...props} />,
              ol: (props) => <ol className="ml-4 list-decimal space-y-1" {...props} />,
            }}
          >
            {slides[index]}
          </ReactMarkdown>
        </div>
      </div>

      {total > 1 && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
              aria-label="Previous summary slide"
            >
              <Icon name="arrow_back" size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
              aria-label="Next summary slide"
            >
              <Icon name="arrow_forward" size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => go(idx)}
                aria-label={`Go to summary slide ${idx + 1}`}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  idx === index ? "bg-destiny-orange" : "bg-[var(--border-subtle)] hover:bg-destiny-orange/60"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
