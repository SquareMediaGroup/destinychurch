"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { UPLOAD_ACCEPT, uploadPostImage } from "@/lib/adminUpload";
import { FieldShell, fieldInputClass } from "./BasicFields";

export function ImageField({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const toast = useToast();

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const result = await uploadPostImage(file);
    setUploading(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    onChange(result.url);
  }

  return (
    <FieldShell label={label} help={help}>
      {value ? (
        <div className="flex items-start gap-3 rounded-xl border border-black/10 bg-white p-2">
          {/* Plain <img>: the upload route returns only a URL, so there are no
              intrinsic dimensions for next/image to work with. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-destiny-grey/50">{value}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="min-h-10 rounded-lg border border-black/10 px-3 text-xs font-bold text-destiny-grey/60 transition hover:bg-[#f5f7fa] lg:min-h-0 lg:px-2.5 lg:py-1"
              >
                {uploading ? "Uploading…" : "Replace"}
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                className="min-h-10 rounded-lg px-3 text-xs font-bold text-destiny-grey/45 transition hover:bg-black/5 hover:text-destiny-red lg:min-h-0 lg:px-2.5 lg:py-1"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragOver(false);
            void upload(event.dataTransfer.files?.[0]);
          }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
            dragOver
              ? "border-destiny-orange bg-destiny-orange/5"
              : "border-black/12 hover:border-destiny-orange/40 hover:bg-[#f5f7fa]"
          }`}
        >
          <span className="material-symbols-rounded text-2xl text-destiny-grey/35">
            {uploading ? "hourglass_top" : "add_photo_alternate"}
          </span>
          <p className="mt-1 text-xs font-bold text-destiny-grey/60">
            {uploading ? (
              "Uploading…"
            ) : (
              <>
                <span className="lg:hidden">Tap to choose an image</span>
                <span className="hidden lg:inline">
                  Drop an image or click to choose
                </span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-destiny-grey/40">
            JPG, PNG, WebP or GIF, up to 5MB
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ""; // allow re-picking the same file
          void upload(file);
        }}
      />

      <input
        className={`${fieldInputClass} mt-2`}
        value={value}
        placeholder="…or paste an image URL"
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
}
