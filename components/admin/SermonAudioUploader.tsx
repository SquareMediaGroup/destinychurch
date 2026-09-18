"use client";

import { useRef, useState } from "react";

const ACCEPT = "audio/mpeg,audio/mp3,audio/wav,audio/x-m4a,audio/mp4,.mp3,.wav,.m4a";

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

export default function SermonAudioUploader({ onUploaded }: { onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [speaker, setSpeaker] = useState("");
  const [notes, setNotes] = useState("");
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = progress !== null;

  function pickFile() {
    inputRef.current?.click();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const file = inputRef.current?.files?.[0];
    if (!title.trim()) return setError("Give the sermon a title.");
    if (!file) return setError("Choose an audio file.");

    setProgress(0);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("speaker", speaker.trim());
      form.set("notes", notes.trim());
      form.set("youtubeVideoId", youtubeVideoId.trim());
      form.set("file", file);
      await uploadWithProgress("/api/admin/sermons/upload", form, setProgress);

      setTitle("");
      setSpeaker("");
      setNotes("");
      setYoutubeVideoId("");
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setProgress(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-destiny-grey/60 dark:text-white/60">
          Title
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Walking In Faith"
          required
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-destiny-grey placeholder:text-destiny-grey/40 focus:border-destiny-orange focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold text-destiny-grey/60 dark:text-white/60">
            Speaker
          </label>
          <input
            value={speaker}
            onChange={(e) => setSpeaker(e.target.value)}
            placeholder="Ps John Smith"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-destiny-grey placeholder:text-destiny-grey/40 focus:border-destiny-orange focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold text-destiny-grey/60 dark:text-white/60">
            YouTube video ID (optional)
          </label>
          <input
            value={youtubeVideoId}
            onChange={(e) => setYoutubeVideoId(e.target.value)}
            placeholder="e.g. dQw4w9WgXcQ"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-destiny-grey placeholder:text-destiny-grey/40 focus:border-destiny-orange focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <p className="mt-1 text-[11px] text-destiny-grey/40 dark:text-white/40">
            Paste it once the video is live on YouTube — pairs this audio to it exactly.
            Leave blank if you&apos;re publishing audio first.
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-bold text-destiny-grey/60 dark:text-white/60">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-destiny-grey placeholder:text-destiny-grey/40 focus:border-destiny-orange focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
      />

      <button
        type="button"
        disabled={busy}
        onClick={pickFile}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/10 px-4 py-6 text-sm font-bold text-destiny-grey/60 transition hover:border-destiny-orange hover:text-destiny-orange disabled:opacity-60 dark:border-white/10 dark:text-white/60"
      >
        <span className="material-symbols-rounded text-xl" aria-hidden="true">graphic_eq</span>
        {fileName || "Choose an audio file"}
      </button>

      {busy && (
        <div>
          <div className="flex items-center justify-between text-xs text-destiny-grey/60 dark:text-white/60">
            <span>Uploading…</span>
            <span>{Math.round((progress ?? 0) * 100)}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-destiny-orange transition-[width]"
              style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-2xl bg-destiny-orange px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Publishing…" : "Publish to Buzzsprout"}
      </button>
    </form>
  );
}
