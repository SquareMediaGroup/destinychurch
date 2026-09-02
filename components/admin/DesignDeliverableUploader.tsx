"use client";

import { useRef, useState } from "react";
import { putFileToStorage, type PrepareResponse } from "@/lib/directUpload";

// Prepare, PUT, complete. The middle step goes straight from this browser to
// Playbook's storage, which is why a 300MB print-ready PDF is fine here and
// would be a 413 through any route that took the bytes itself.
const ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/tiff,application/pdf,application/postscript,application/zip,video/mp4,video/quicktime,video/webm,.ai,.eps,.psd,.indd";

export default function DesignDeliverableUploader({
  ticketId,
  onUploaded,
}: {
  ticketId: string;
  onUploaded: () => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError("");
    setFileName(file.name);
    setProgress(0);

    try {
      const prepRes = await fetch(
        `/api/admin/design/tickets/${ticketId}/deliverables/prepare`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_name: file.name,
            // Some design formats (.ai, .indd) arrive with an empty type from
            // the OS. Fall back rather than failing the allow-list on a blank.
            media_type: file.type || "application/octet-stream",
            size: file.size,
          }),
        },
      );

      const prepared: PrepareResponse & { error?: string } = await prepRes.json();
      if (!prepRes.ok) throw new Error(prepared.error ?? "Couldn't start the upload");

      await putFileToStorage(file, prepared, (fraction) => setProgress(fraction));

      const completeRes = await fetch(
        `/api/admin/design/tickets/${ticketId}/deliverables/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signed_gcs_id: prepared.signedGcsId,
            multipart_upload_id: prepared.multipartUploadId,
            file_name: file.name,
            media_type: file.type || "application/octet-stream",
            size: file.size,
          }),
        },
      );

      const done = await completeRes.json();
      if (!completeRes.ok) throw new Error(done.error ?? "Couldn't finish the upload");

      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setProgress(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const busy = progress !== null;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
      />

      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 px-4 py-6 text-sm font-bold text-destiny-grey/60 transition hover:border-destiny-orange hover:text-destiny-orange disabled:opacity-60 dark:border-white/10 dark:text-white/60"
      >
        <span className="material-symbols-rounded text-xl">upload_file</span>
        {busy ? "Uploading…" : "Upload a file"}
      </button>

      {busy ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-destiny-grey/60 dark:text-white/60">
            <span className="truncate">{fileName}</span>
            <span>{Math.round((progress ?? 0) * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-destiny-orange transition-[width]"
              style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-destiny-grey/40 dark:text-white/40">
        Up to 2GB per file. Uploads go straight to Playbook, so large source files are fine.
      </p>
    </div>
  );
}
