"use client";

import { useState, useRef } from "react";
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

        const response = await fetch("/api/admin/builder/ai/upload-media", {
          method: "POST",
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
      // Auto-open the question form for the last uploaded item
      setEditingId(newMedia[newMedia.length - 1].id);
    }
    setUploading(false);
  }

  async function handleAddVideo() {
    if (!videoUrl.trim()) return;
    setError("");
    setAddingVideo(true);

    try {
      const response = await fetch("/api/admin/builder/ai/add-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    fetch("/api/admin/builder/ai/upload-media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        purpose: updates.purpose,
        description: updates.description,
        altText: updates.altText,
      }),
    }).catch(() => {
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
            placeholder="YouTube, Vimeo, or .mp4 URL"
            disabled={disabled || addingVideo}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-destiny-orange focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="button"
            onClick={handleAddVideo}
            disabled={!videoUrl.trim() || disabled || addingVideo}
            className="px-4 py-2 bg-destiny-orange text-white text-sm font-semibold rounded hover:brightness-110 disabled:bg-gray-400 transition-colors"
          >
            {addingVideo ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Media list */}
      {media.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-destiny-grey uppercase tracking-wide">
            Media ({media.length})
          </p>
          {media.map((item) => (
            <MediaItemCard
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              onEdit={() => setEditingId(item.id)}
              onClose={() => setEditingId(null)}
              onUpdate={(updates) => updateMediaItem(item.id, updates)}
              onRemove={() => removeMediaItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type MediaItemCardProps = {
  item: MediaItem;
  isEditing: boolean;
  onEdit: () => void;
  onClose: () => void;
  onUpdate: (updates: Partial<MediaItem>) => void;
  onRemove: () => void;
};

function MediaItemCard({
  item,
  isEditing,
  onEdit,
  onClose,
  onUpdate,
  onRemove,
}: MediaItemCardProps) {
  const previewUrl =
    item.mediaType === "image"
      ? item.thumbnailUrl
      : item.thumbnailUrl || "/video-placeholder.svg";

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="flex gap-3 p-3">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={item.altText || "Media preview"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">
              {item.mediaType === "video" ? "🎬" : "🖼️"}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-destiny-grey truncate">
                {item.purpose
                  ? PURPOSES.find((p) => p.value === item.purpose)?.label ||
                    item.purpose
                  : "Untagged"}
                {item.mediaType === "video" && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({item.sourceType})
                  </span>
                )}
              </p>
              {item.description && (
                <p className="text-xs text-gray-600 truncate">
                  {item.description}
                </p>
              )}
              {!item.description && (
                <p className="text-xs text-orange-600">
                  ⚠ Add a description for AI to use this media
                </p>
              )}
            </div>
            <div className="flex gap-1">
              {!isEditing && (
                <button
                  onClick={onEdit}
                  className="text-xs text-destiny-orange hover:underline"
                >
                  Edit
                </button>
              )}
              <button
                onClick={onRemove}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {isEditing && (
        <div className="border-t border-gray-200 p-3 space-y-3 bg-gray-50">
          <div>
            <label className="block text-xs font-semibold text-destiny-grey mb-1">
              What is this for?
            </label>
            <select
              value={item.purpose}
              onChange={(e) =>
                onUpdate({ purpose: e.target.value as MediaPurpose })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-destiny-orange focus:border-transparent"
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
              Describe this {item.mediaType}
            </label>
            <textarea
              value={item.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="E.g., 'Pastor John speaking at Easter service' or 'Youth group photo from camp'"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-destiny-orange focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              This helps AI choose where to place it
            </p>
          </div>

          {item.mediaType === "image" && (
            <div>
              <label className="block text-xs font-semibold text-destiny-grey mb-1">
                Alt text (for accessibility)
              </label>
              <input
                type="text"
                value={item.altText || ""}
                onChange={(e) => onUpdate({ altText: e.target.value })}
                placeholder="Brief description of the image"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-destiny-orange focus:border-transparent"
              />
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-3 py-2 bg-destiny-orange text-white text-sm font-semibold rounded hover:brightness-110 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
