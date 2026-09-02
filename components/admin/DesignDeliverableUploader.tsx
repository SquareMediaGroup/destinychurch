"use client";

import { useRef, useState } from "react";

// Two delivery paths, because one flow doesn't fit both shapes of file:
//   - image/PDF: uploaded straight into Supabase Storage, capped at 50MB —
//     small enough to go through our own server in one request, no signed
//     upload dance needed.
//   - video: no upload at all. A finished video routinely blows past 50MB and
//     Vercel's request-body cap, so the designer pastes a Drive or Playbook
//     share link instead and we just store/display it.
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,application/pdf";

function uploadWithProgress(
  url: string,
  form: FormData,
  onProgress: (fraction: number) => void,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: unknown = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON error body — fall through to the generic message below
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error((body as { error?: string }).error ?? "Upload failed"));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(form);
  });
}

export default function DesignDeliverableUploader({
  ticketId,
  onUploaded,
}: {
  ticketId: string;
  onUploaded: () => void;
}) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError("");
    setFileName(file.name);
    setProgress(0);

    try {
      const form = new FormData();
      form.set("file", file);
      await uploadWithProgress(
        `/api/admin/design/tickets/${ticketId}/deliverables/upload`,
        form,
        setProgress,
      );
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setProgress(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLinkBusy(true);
    try {
      const res = await fetch(`/api/admin/design/tickets/${ticketId}/deliverables/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkUrl }),
      });
      const done = await res.json();
      if (!res.ok) throw new Error(done.error ?? "Couldn't add that link");
      setLinkUrl("");
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that link");
    } finally {
      setLinkBusy(false);
    }
  }

  const busy = progress !== null;

  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-xl bg-black/[0.04] p-1 text-xs font-bold dark:bg-white/5">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`flex-1 rounded-lg py-1.5 transition ${
            mode === "file"
              ? "bg-white text-destiny-grey shadow-sm dark:bg-white/10 dark:text-white"
              : "text-destiny-grey/50 dark:text-white/50"
          }`}
        >
          Image or PDF
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`flex-1 rounded-lg py-1.5 transition ${
            mode === "link"
              ? "bg-white text-destiny-grey shadow-sm dark:bg-white/10 dark:text-white"
              : "text-destiny-grey/50 dark:text-white/50"
          }`}
        >
          Video link
        </button>
      </div>

      {mode === "file" ? (
        <>
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

          <p className="mt-3 text-xs text-destiny-grey/40 dark:text-white/40">
            JPEG, PNG, WebP, GIF, SVG or PDF. Up to 50MB.
          </p>
        </>
      ) : (
        <form onSubmit={addLink}>
          <div className="flex gap-2">
            <input
              type="url"
              required
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://drive.google.com/... or https://playbook.com/..."
              className="min-w-0 flex-1 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-destiny-grey placeholder:text-destiny-grey/40 focus:border-destiny-orange focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <button
              type="submit"
              disabled={linkBusy}
              className="rounded-2xl bg-destiny-orange px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {linkBusy ? "Adding…" : "Add"}
            </button>
          </div>
          <p className="mt-3 text-xs text-destiny-grey/40 dark:text-white/40">
            Paste a shareable Google Drive or Playbook link — it&apos;s embedded on the ticket,
            never uploaded here.
          </p>
        </form>
      )}

      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
