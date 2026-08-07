/**
 * Shared image upload for admin surfaces.
 *
 * Extracted from `components/admin/RichTextEditor.tsx`, which had this inlined
 * in its toolbar, so the block inspector's image field can reuse it rather than
 * become the seventh place in the codebase that hand-rolls a FormData POST.
 *
 * Hits `app/api/admin/posts/upload/route.ts`, which auto-rotates from EXIF,
 * resizes to max 1600px wide and re-encodes to WebP at quality 82 in the
 * `post-media` bucket.
 */
export type UploadResult = { url: string } | { error: string };

/** Mirrors the API route's own allow-list. */
export const UPLOAD_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

/** Mirrors MAX_UPLOAD_SIZE_BYTES in lib/ai/media-types.ts (5MB). */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export async function uploadPostImage(file: File): Promise<UploadResult> {
  // Checked here as well as server-side so a 6MB photo fails instantly rather
  // than after a slow upload.
  if (file.size > UPLOAD_MAX_BYTES) {
    return { error: "That image is larger than 5MB. Please choose a smaller one." };
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("/api/admin/posts/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      return { error: data.error || "Image upload failed." };
    }
    return { url: data.url as string };
  } catch {
    return { error: "Image upload failed. Check your connection and try again." };
  }
}
