"use client";

import { lazy, Suspense, useState } from "react";
import Button from "@/components/ui/Button";

// thinking-orbs and border-beam are decorative-only, so they're code-split out
// of the main bundle rather than shipped to every visitor who loads /media.
// Both are used tastefully here and nowhere else on this page: the glow is
// tied strictly to the real upload request being in flight, exactly the way
// components/FloatingSmartSearch.tsx ties BorderBeam's `active` prop to its
// own real loading state, not left running as ambient decoration.
const ThinkingOrb = lazy(() =>
  import("thinking-orbs").then((mod) => ({ default: mod.ThinkingOrb })),
);
const BorderBeam = lazy(() =>
  import("border-beam").then((mod) => ({ default: mod.BorderBeam })),
);

function OrbFallback() {
  return (
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-destiny-orange" />
  );
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 90 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

export default function UploadModal({
  boardToken,
  onClose,
}: {
  boardToken: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [website, setWebsite] = useState(""); // honeypot — real visitors never see or fill this
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setError("");
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ALLOWED.includes(selected.type)) {
      setError("Please choose a JPEG, PNG, WebP photo or an MP4, MOV or WebM video.");
      setFile(null);
      return;
    }
    const isVideo = ALLOWED_VIDEO_TYPES.includes(selected.type);
    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (selected.size > maxBytes) {
      setError(
        `That file is over ${Math.round(maxBytes / (1024 * 1024))}MB — try a smaller one.`,
      );
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a photo or video to upload.");
      return;
    }
    setIsUploading(true);
    setError("");

    const form = new FormData();
    form.set("file", file);
    form.set("board_token", boardToken);
    form.set("uploader_name", name);
    form.set("website", website);

    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — please try again.");
        return;
      }
      setDone(true);
      setTimeout(onClose, 2500);
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <Suspense fallback={<div className="my-8 w-full max-w-md" />}>
        <BorderBeam
          size="md"
          borderRadius={24}
          active={isUploading}
          strength={1}
          className="my-8 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        >
          <div onClick={(e) => e.stopPropagation()}>
            {done ? (
              <div className="py-8 text-center">
                <span className="material-symbols-rounded mb-3 text-4xl text-destiny-green">
                  check_circle
                </span>
                <p className="font-black text-destiny-grey">Thanks!</p>
                <p className="mt-1 text-sm text-destiny-grey/60">
                  It&apos;ll appear once it&apos;s been approved.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-black text-destiny-grey">Add a photo or video</h2>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/50 transition hover:bg-black/5 hover:text-destiny-grey"
                  >
                    <span className="material-symbols-rounded text-xl">close</span>
                  </button>
                </div>

                {error && (
                  <p className="mb-4 rounded-xl bg-destiny-red/10 px-4 py-2.5 text-sm font-medium text-destiny-red">
                    {error}
                  </p>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-destiny-grey/45">
                      Your name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={100}
                      placeholder="e.g. Sarah"
                      className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-destiny-grey/45">
                      Photo or video
                    </label>
                    <input
                      type="file"
                      accept={ALLOWED.join(",")}
                      onChange={handleFileChange}
                      required
                      className="w-full text-sm text-destiny-grey/70 file:mr-3 file:rounded-lg file:border-0 file:bg-destiny-orange/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-destiny-orange"
                    />
                  </div>

                  {/* Honeypot — hidden from real visitors via CSS, so only a bot fills it in. */}
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    className="absolute -left-[9999px]"
                    aria-hidden="true"
                  />

                  <Button type="submit" disabled={isUploading} className="mt-1">
                    {isUploading ? (
                      <>
                        <Suspense fallback={<OrbFallback />}>
                          <ThinkingOrb state="searching" size={20} />
                        </Suspense>
                        Uploading…
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </BorderBeam>
      </Suspense>
    </div>
  );
}
