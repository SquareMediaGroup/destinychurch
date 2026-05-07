export type MediaPurpose =
  | "hero"
  | "background"
  | "team"
  | "event"
  | "general"
  | "logo"
  | "ministry";

export type MediaSourceType = "upload" | "youtube" | "vimeo" | "external";

export type MediaType = "image" | "video";

export interface MediaItem {
  id: string;
  mediaType: MediaType;
  sourceType: MediaSourceType;
  // Upload URLs (for images)
  originalUrl?: string;
  heroUrl?: string; // 1920x1080 webp
  generalUrl?: string; // 800x600 webp
  thumbnailUrl?: string; // 400x300 webp
  // External URL (for videos)
  externalUrl?: string;
  // Metadata
  purpose: MediaPurpose;
  description: string;
  altText?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
}

export interface UploadResponse {
  id: string;
  originalUrl: string;
  heroUrl: string;
  generalUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface VideoUrlResponse {
  id: string;
  externalUrl: string;
  sourceType: "youtube" | "vimeo" | "external";
  thumbnailUrl?: string;
  videoId?: string; // YouTube/Vimeo ID
}

// Constraints
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

// Image variant configurations
export const IMAGE_VARIANTS = {
  hero: { width: 1920, height: 1080, quality: 85 },
  general: { width: 800, height: 600, quality: 80 },
  thumbnail: { width: 400, height: 300, quality: 75 },
} as const;

// Helper to detect video provider from URL
export function detectVideoSource(url: string): MediaSourceType | null {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) {
    return "youtube";
  }
  if (lower.includes("vimeo.com")) {
    return "vimeo";
  }
  if (lower.match(/\.(mp4|webm|mov|avi)$/i)) {
    return "external";
  }
  return null;
}

// Extract YouTube video ID
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Extract Vimeo video ID
export function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

// Get YouTube thumbnail
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Validate URL is a supported video format
export function validateVideoUrl(url: string): {
  valid: boolean;
  source?: MediaSourceType;
  videoId?: string;
  thumbnailUrl?: string;
  error?: string;
} {
  try {
    new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  const source = detectVideoSource(url);
  if (!source) {
    return {
      valid: false,
      error: "URL must be a YouTube, Vimeo, or direct video file (.mp4, .webm, .mov)",
    };
  }

  if (source === "youtube") {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
      return { valid: false, error: "Could not extract YouTube video ID" };
    }
    return {
      valid: true,
      source,
      videoId,
      thumbnailUrl: getYouTubeThumbnail(videoId),
    };
  }

  if (source === "vimeo") {
    const videoId = extractVimeoId(url);
    if (!videoId) {
      return { valid: false, error: "Could not extract Vimeo video ID" };
    }
    return { valid: true, source, videoId };
  }

  return { valid: true, source };
}
