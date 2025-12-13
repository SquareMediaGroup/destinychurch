"use client";

import { useState } from "react";
import ConfirmSubmit from "./ConfirmSubmit";

type ProcessingMode = "upload" | "v2";
type ServerAction = (formData: FormData) => void | Promise<void>;

type AiProcessingControlsProps = {
  sermonId: string;
  hasTranscript: boolean;
  hasSummaryPoints: boolean;
  uploadAction: ServerAction;
  v2Action: ServerAction;
};

export default function AiProcessingControls({
  sermonId,
  hasTranscript,
  hasSummaryPoints,
  uploadAction,
  v2Action,
}: AiProcessingControlsProps) {
  const defaultMode: ProcessingMode = hasTranscript && !hasSummaryPoints ? "v2" : "upload";
  const [mode, setMode] = useState<ProcessingMode>(defaultMode);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-destiny-blue/20 bg-destiny-blue/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-destiny-grey/70">
          Choose processing path
        </span>
        <div className="flex rounded-full bg-white shadow-sm ring-1 ring-black/5">
          <ModeButton
            label="Upload file"
            active={mode === "upload"}
            onClick={() => setMode("upload")}
          />
          <ModeButton label="AI V2" active={mode === "v2"} onClick={() => setMode("v2")} />
        </div>
      </div>

      {mode === "upload" ? (
        <form
          action={uploadAction}
          encType="multipart/form-data"
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={sermonId} />
          <label className="text-[11px] font-semibold text-destiny-grey">
            <span className="mr-2 text-destiny-black">Upload SRT/VTT</span>
            <input
              type="file"
              name="srt"
              accept=".srt,.vtt"
              className="max-w-[180px] text-[11px] text-destiny-grey file:mr-2 file:rounded-full file:border file:border-destiny-blue/40 file:bg-destiny-blue/10 file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-destiny-blue"
              required
            />
          </label>
          <ConfirmSubmit
            className="rounded-full border border-destiny-blue px-3 py-1.5 text-[11px] font-semibold text-destiny-blue transition hover:bg-destiny-blue hover:text-white"
            confirmMessage="Ingest this SRT/VTT as the transcript and generate summary + points?"
            pendingLabel="Uploading..."
          >
            Upload & summarize
          </ConfirmSubmit>
        </form>
      ) : (
        <form action={v2Action} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={sermonId} />
          <ConfirmSubmit
            className="rounded-full border border-destiny-blue px-4 py-2 text-xs font-semibold text-destiny-blue transition hover:bg-destiny-blue hover:text-white"
            confirmMessage="Run AI V2 summary points for this sermon? Requires transcript segments."
            pendingLabel="Processing..."
          >
            Process AI V2
          </ConfirmSubmit>
          <p className="text-[11px] text-destiny-grey/80">
            Generates structured summary points from the stored transcript.
          </p>
        </form>
      )}
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
        active
          ? "bg-destiny-blue text-white shadow-sm"
          : "text-destiny-grey hover:bg-destiny-blue/10 hover:text-destiny-blue"
      }`}
    >
      {label}
    </button>
  );
}
