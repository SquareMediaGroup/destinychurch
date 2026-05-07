"use client";

import { useState, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { MediaItem, MediaPurpose } from "@/lib/ai/media-types";
import {
  MAX_UPLOAD_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from "@/lib/ai/media-types";

type MediaUploaderProps = {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  disabled?: boolean;
};

const PURPOSES: { value: MediaPurpose; label: string }[] = [
  { value: "hero", label: "Hero / Header" },
  { value: "background", label: "Background" },
  { value: "team", label: "Team / People" },
  { value: "event", label: "Event" },
  { value: "ministry", label: "Ministry" },
  { value: "logo", label: "Logo / Brand" },
  { value: "general", label: "General" },
];

export default function MediaUploader({
  media,
  onMediaChange,
  disabled = false,
}: MediaUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [addingVideo, setAddingVideo] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function getAuthHeaders() {
    const supabase = getSupabaseBrowserClient();
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) throw new Error("Not authenticated");
    return { "Authorization": `Bearer ${token}` };
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    setUploading(true);

    const newMedia: MediaItem[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        setError(`${file.name} is too large (max 5MB)`);
        continue;
      }
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError(`${file.name} has an unsupported file type`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const headers = await getAuthHeaders();
        const response = await fetch("/api/admin/builder/ai/upload-media", {
          method: "POST",
          headers,
          body: formData,
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || "Upload failed");
        }

        const data = (await response.json()) as {
          id: string;
          originalUrl: string;
          heroUrl: string;
          generalUrl: string;
          thumbnailUrl: string;
          width: number;
          height: number;
          sizeBytes: number;
        };

        newMedia.push({
          id: data.id,
          mediaType: "image",
          sourceType: "upload",
          originalUrl: data.originalUrl,
          heroUrl: data.heroUrl,
          generalUrl: data.generalUrl,
          thumbnailUrl: data.thumbnailUrl,
          purpose: "general",
          description: "",
          width: data.width,
          height: data.height,
          sizeBytes: data.sizeBytes,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    }

    if (newMedia.length > 0) {
      const allMedia = [...media, ...newMedia];
      onMediaChange(allMedia);
      setEditingId(newMedia[newMedia.length - 1].id);
    }
    setUploading(false);
  }

  async function handleAddVideo() {
    if (!videoUrl.trim()) return;
    setError("");
    setAddingVideo(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/builder/ai/add-video", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: videoUrl }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Failed to add video");
      }

      const data = (await response.json()) as {
        id: string;
        externalUrl: string;
        sourceType: "youtube" | "vimeo" | "external";
        thumbnailUrl?: string;
      };

      const newVideo: MediaItem = {
        id: data.id,
        mediaType: "video",
        sourceType: data.sourceType,
        externalUrl: data.externalUrl,
        thumbnailUrl: data.thumbnailUrl,
        purpose: "general",
        description: "",
      };

      onMediaChange([...media, newVideo]);
      setEditingId(newVideo.id);
      setVideoUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add video");
    } finally {
      setAddingVideo(false);
    }
  }

  function updateMediaItem(id: string, updates: Partial<MediaItem>) {
    const updated = media.map((m) => (m.id === id ? { ...m, ...updates } : m));
    onMediaChange(updated);

    // Persist the metadata update to the server
    getAuthHeaders()
      .then((headers) =>
        fetch("/api/admin/builder/ai/upload-media", {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            id,
            purpose: updates.purpose,
            description: updates.description,
            altText: updates.altText,
          }),
        })
      )
      .catch(() => {
        // Silent fail — metadata update is non-critical
      });
  }

  function removeMediaItem(id: string) {
    onMediaChange(media.filter((m) => m.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive
            ? "border-destiny-orange bg-destiny-orange/10"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || uploading}
          className="hidden"
        />
        <div className="space-y-2">
          <div className="text-3xl">📸</div>
          <p className="text-sm font-semibold text-destiny-grey">
            {uploading ? "Uploading..." : "Drop images here or click to upload"}
          </p>
          <p className="text-xs text-gray-500">
            JPG, PNG, WebP, GIF · Max 5MB · Auto-converts to WebP
          </p>
        </div>
      </div>

      {/* Video URL input */}
      <div className="border border-gray-300 rounded-lg p-4 bg-white">
        <label className="block text-xs font-semibold text-destiny-grey mb-2">
          Or add a video URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            disabled={disabled || addingVideo}
            placeholder="YouTube, Vimeo, or direct video URL"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-destiny-orange focus:border-transparent disabled:bg-gray-100"
            onKeyPress={(e) => e.key === "Enter" && handleAddVideo()}
          />
          <button
            type="button"
            onClick={handleAddVideo}
            disabled={disabled || addingVideo || !videoUrl.trim()}
            className="px-4 py-2 bg-destiny-orange text-white text-sm font-semibold rounded-lg hover:brightness-110 disabled:bg-gray-400 transition-colors"
          >
            {addingVideo ? "Adding..." : "Add"}
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mt-1">
          Supports YouTube, Vimeo, or direct links to video files
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Media list */}
      {media.length > 0 && (
        <div className="space-y-3">
          {media.map((item) => (
            <div
              key={item.id}
              className="border border-gray-300 rounded-lg p-4 bg-white"
            >
              {/* Preview thumbnail + details */}
              <div className="flex gap-4 items-start mb-3">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={item.thumbnailUrl || item.externalUrl || ""}
                    alt={item.altText || ""}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-destiny-orange mb-1">
                    {item.mediaType === "image" ? "📷 Image" : "🎬 Video"}
                  </div>
                  <p className="text-xs text-destiny-grey/70 truncate">
                    {item.sourceType === "upload" && item.originalUrl
                      ? item.originalUrl.split("/").pop() || "Uploaded image"
                      : item.externalUrl || "Media item"}
                  </p>
                  {item.width && item.height && (
                    <p className="text-[11px] text-destiny-grey/50">
                      {item.width} × {item.height}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMediaItem(item.id)}
                  className="p-2 text-destiny-grey/40 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <span className="material-symbols-rounded text-base">
                    delete
                  </span>
                </button>
              </div>

              {/* Edit section */}
              {editingId === item.id ? (
                <div className="space-y-3 bg-destiny-orange/5 -mx-4 -mb-4 p-4 rounded-b-lg">
                  <div>
                    <label className="block text-xs font-semibold text-destiny-grey mb-1">
                      What is this image for?
                    </label>
                    <select
                      value={item.purpose}
                      onChange={(e) =>
                        updateMediaItem(item.id, { purpose: e.target.value as MediaPurpose })
                      }
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-destiny-orange focus:border-transparent"
                    >
                      {PURPOSES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-destiny-grey mb-1">
                      Description (helps AI place it correctly)
                    </label>
                    <textarea
                      value={item.description}
                      onChange={(e) =>
                        updateMediaItem(item.id, { description: e.target.value })
                      }
                      placeholder="E.g., 'Church building exterior', 'Pastor smiling at pulpit', 'Group of volunteers'"
                      rows={2}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-destiny-orange focus:border-transparent resize-none"
                    />
                  </div>
                  {item.mediaType === "image" && (
                    <div>
                      <label className="block text-xs font-semibold text-destiny-grey mb-1">
                        Alt text (for accessibility)
                      </label>
                      <input
                        type="text"
                        value={item.altText || ""}
                        onChange={(e) =>
                          updateMediaItem(item.id, { altText: e.target.value })
                        }
                        placeholder="Describe the image for screen readers"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-destiny-orange focus:border-transparent"
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="w-full px-2 py-1.5 bg-destiny-orange/10 text-destiny-orange text-xs font-semibold rounded hover:bg-destiny-orange/20 transition"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingId(item.id)}
                  className="w-full px-3 py-2 text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-xs font-semibold text-destiny-grey transition"
                >
                  {item.description ? (
                    <>
                      <span className="text-destiny-grey/60">Purpose:</span>{" "}
                      {PURPOSES.find((p) => p.value === item.purpose)?.label} ·{" "}
                      {item.description}
                    </>
                  ) : (
                    "Add description (click to edit)"
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
