"use client";

import { useMemo } from "react";
import type { TranscriptSegment } from "@/lib/types";
import ReportIssueLauncher from "./ReportIssueLauncher";

type TranscriptBlockProps = {
  transcript?: string;
  sermonId?: string;
  sermonTitle?: string;
  segments?: TranscriptSegment[];
  disabled?: boolean;
};

export default function TranscriptBlock({
  transcript,
  sermonId,
  sermonTitle,
  segments,
  disabled = false,
}: TranscriptBlockProps) {
  const segmentedTranscript = useMemo(() => {
    if (!segments?.length) return null;
    return segments.map((segment) => {
      const words = segment.text.split(/\s+/).filter(Boolean);
      const duration = Math.max(segment.end - segment.start, 0.01);
      const step = words.length ? duration / words.length : 0;

      return {
        id: segment.id,
        words: words.map((word, index) => ({
          word,
          time: segment.start + index * step,
        })),
      };
    });
  }, [segments]);

  const handleJump = (seconds: number) => {
    const audio = document.querySelector("audio");
    if (audio) {
      try {
        audio.currentTime = seconds;
        audio.play?.();
      } catch (error) {
        console.warn("Unable to seek audio", error);
      }
    }
  };

  if (disabled) {
    return (
      <div className="rounded-xl border border-destiny-orange/20 bg-destiny-orange/10 px-4 py-4 text-sm text-[var(--foreground)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-destiny-orange">
          Transcripts temporarily unavailable
        </p>
        <p className="mt-1 text-sm text-destiny-grey">
          Sorry about this — we&apos;re improving transcript quality and will bring them back soon.
        </p>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="rounded-xl border border-destiny-grey/10 bg-destiny-grey/5 px-4 py-3 text-sm text-destiny-grey">
        Transcript is still processing. Please check back shortly.
      </div>
    );
  }

  return (
    <details className="group rounded-xl border border-black/5 bg-white shadow-sm">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-destiny-black transition group-open:border-b group-open:border-black/5 sm:px-5">
        <div className="flex items-center gap-2">
          <span>Transcript</span>
          <span className="text-xs font-medium text-destiny-orange">
            {segmentedTranscript ? "Tap words to jump" : "Click to toggle"}
          </span>
        </div>
        {sermonId && sermonTitle ? (
          <ReportIssueLauncher
            sermonId={sermonId}
            sermonTitle={sermonTitle}
            issueType="transcript"
            label="Report"
          />
        ) : null}
      </summary>
      <div className="px-4 pb-4 pt-2 text-sm leading-relaxed text-destiny-grey sm:px-5">
        {segmentedTranscript ? (
          <div className="space-y-3">
            {segmentedTranscript.map((segment) => (
              <p key={segment.id} className="flex flex-wrap gap-x-1 gap-y-1">
                {segment.words.map((word, index) => (
                  <button
                    key={`${segment.id}-${index}`}
                    type="button"
                    onClick={() => handleJump(word.time)}
                    className="inline-flex items-center text-left text-[var(--foreground)] transition hover:text-destiny-orange hover:underline"
                  >
                    {word.word}
                  </button>
                ))}
              </p>
            ))}
          </div>
        ) : (
          <p className="whitespace-pre-line">{transcript}</p>
        )}
      </div>
    </details>
  );
}
