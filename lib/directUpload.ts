// Browser-side half of the video direct-upload flow — PUTs bytes straight to
// Playbook's storage (GCS or Backblaze) using the signed destination(s) from
// POST /api/media/upload/prepare. Runs entirely client-side: fetch/XHR here
// talk directly to Google/Backblaze, never through our own server, which is
// the whole point (no Vercel body-size cap on this leg of the transfer).

/** PUT with upload-progress reporting — fetch has no progress event, XHR does. */
function putWithProgress(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload to storage failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload to storage failed"));
    xhr.send(body);
  });
}

export interface PrepareResponse {
  honeypot?: boolean;
  storageProvider?: "gcs" | "backblaze";
  uploadUrl?: string | null;
  signedGcsId?: string;
  fileExtension?: string;
  encryptedOrganizationMetadata?: string | null;
  multipartUploadId?: string | null;
  partSize?: number | null;
  parts?: { part_number: number; url: string }[] | null;
}

/**
 * Sends the file's bytes to wherever `prepare` said to put them. Handles all
 * three shapes the same way lib/playbook.server.ts's server-side uploadAsset
 * does — GCS resumable, Backblaze single-part, Backblaze multipart — since
 * which one applies is decided by Playbook, not the caller.
 */
export async function putFileToStorage(
  file: File,
  prepared: PrepareResponse,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  if (prepared.storageProvider === "gcs") {
    if (!prepared.uploadUrl) throw new Error("Missing upload destination");
    // Resumable protocol: an empty POST opens a session (Location header),
    // then the bytes go to that session URL.
    const startRes = await fetch(prepared.uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "x-goog-resumable": "start",
        ...(prepared.encryptedOrganizationMetadata
          ? { "x-goog-meta-encrypted-organization-metadata": prepared.encryptedOrganizationMetadata }
          : {}),
        ...(prepared.fileExtension ? { "x-goog-meta-extension": prepared.fileExtension } : {}),
      },
    });
    const sessionUrl = startRes.headers.get("location");
    if (!startRes.ok || !sessionUrl) {
      throw new Error("Could not start the upload — please try again.");
    }
    await putWithProgress(sessionUrl, file, { "Content-Type": file.type }, onProgress);
  } else if (prepared.multipartUploadId && prepared.parts && prepared.partSize) {
    const partSize = prepared.partSize;
    const parts = [...prepared.parts].sort((a, b) => a.part_number - b.part_number);
    let uploadedBytes = 0;
    for (const part of parts) {
      const start = (part.part_number - 1) * partSize;
      const chunk = file.slice(start, start + partSize);
      await putWithProgress(part.url, chunk, {}, (fraction) => {
        if (onProgress) onProgress((uploadedBytes + fraction * chunk.size) / file.size);
      });
      uploadedBytes += chunk.size;
      if (onProgress) onProgress(uploadedBytes / file.size);
    }
  } else {
    if (!prepared.uploadUrl) throw new Error("Missing upload destination");
    await putWithProgress(
      prepared.uploadUrl,
      file,
      {
        "Content-Type": file.type,
        ...(prepared.fileExtension ? { "x-amz-meta-extension": prepared.fileExtension } : {}),
        ...(prepared.encryptedOrganizationMetadata
          ? { "x-amz-meta-encrypted-organization-metadata": prepared.encryptedOrganizationMetadata }
          : {}),
      },
      onProgress,
    );
  }
}
