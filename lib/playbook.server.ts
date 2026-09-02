// Playbook (dev.playbook.com) — the DAM that stores design ticket deliverables.
//
// Auth: PLAYBOOK_TOKEN (Bearer token, write scope). Org: PLAYBOOK_ORG_SLUG,
// defaulting to "dctv" (Destiny Church Tees Valley's Pro-plan workspace; the
// account also has an unrelated free-plan "destinytees" workspace, which is why
// the slug is not left to be guessed at request time).
//
// This file previously backed the /media photo gallery and was deleted along
// with it (e7d7687). It is restored here, trimmed to what the design ticket
// queue actually uses: board resolution, the two-step upload, a short-lived
// display URL, and delete.
//
// Deliberately NOT restored: listBoards, listBoardAssets, searchAssets — those
// existed for the "import from an existing Playbook board" picker, which has no
// counterpart here — and requestPermalink/ensurePermalink.
//
// The permalink omission is the load-bearing one. Playbook offers two URL
// lifetimes, and only one of them is right for this feature:
//   - `display_url`: SIGNED, expires in ~24h. Minted per download, handed
//     straight to the browser as a redirect, never stored and never emailed.
//   - `permalink`: unsigned and permanent, but capped by plan (Pro = 1,000).
// A design deliverable is only ever fetched by someone following a fresh link
// from the ticket — the admin page, or the requester's tokenised page — so it
// never needs a permanent URL, and spending a finite permalink on one would be
// pure waste. tests/unit/design-access.spec.ts fails the build if any route in
// this module reaches for one anyway.
import "server-only";

const API_BASE = "https://api.playbook.com/v1";
const ORG_SLUG = process.env.PLAYBOOK_ORG_SLUG || "dctv";

function token(): string {
  const t = process.env.PLAYBOOK_TOKEN;
  if (!t) throw new Error("Missing PLAYBOOK_TOKEN");
  return t;
}

async function pbFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${API_BASE}/${ORG_SLUG}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Playbook ${init.method ?? "GET"} ${path} -> ${res.status}: ${body.slice(0, 500)}`);
  }
  if (res.status === 204) return null;
  return res.json();
}
/* ── Boards ────────────────────────────────────────────────────────────────── */

interface PlaybookBoard {
  id: number;
  token: string;
  title: string;
}

/**
 * Find a board by exact title, or create it. Playbook has no "find or create"
 * endpoint, so this lists (filtered by `query`, which is a substring match) and
 * checks for an exact title match before creating — cheap, and idempotent
 * enough that calling it twice for the same board title never creates a
 * duplicate in practice (the two calls a board's lifecycle actually makes —
 * on creation, and lazily if an older board is missing its token — are never
 * truly concurrent with each other).
 */
export async function getOrCreateBoard(title: string): Promise<string> {
  const list = (await pbFetch(
    `/boards?query=${encodeURIComponent(title)}&per_page=50`,
  )) as { data: PlaybookBoard[] };
  const existing = list.data.find((b) => b.title === title);
  if (existing) return existing.token;

  const created = (await pbFetch("/boards", {
    method: "POST",
    body: JSON.stringify({ collection: { title } }),
  })) as { data: PlaybookBoard };
  return created.data.token;
}

/** Full details for one asset, including its size and media type. */
export async function getAsset(assetToken: string): Promise<PlaybookAsset> {
  const res = (await pbFetch(`/assets/${assetToken}`)) as { data: PlaybookAsset };
  return res.data;
}

/* ── Upload (two-step: prepare, PUT bytes, complete) ─────────────────────────── */

export interface UploadPrepareResponse {
  storage_provider: "gcs" | "backblaze";
  upload_url?: string;
  signed_gcs_id: string;
  file_extension: string;
  encrypted_organization_metadata?: string;
  multipart_upload_id?: string;
  part_size?: number;
  parts?: { part_number: number; url: string }[];
}

export interface PlaybookAsset {
  id: number;
  token: string;
  title: string;
  media_type: string | null;
  is_skeleton: boolean;
  permalink: string | null;
  display_url: string | null;
  size?: number;
  primary_width?: number | null;
  primary_height?: number | null;
  thumbnails?: { url: string; width: number; height: number }[];
  uploaded_by?: { name: string | null } | null;
  created_at?: string;
  is_group?: boolean;
  first_displayable_child?: { token: string; display_url?: string | null } | null;
}
async function putBytes(url: string, buffer: Buffer, headers: Record<string, string>) {
  const res = await fetch(url, { method: "PUT", body: new Uint8Array(buffer), headers });
  if (!res.ok) {
    throw new Error(`Upload PUT to storage failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  return res;
}
/**
 * Step 1 of the two-step upload flow: ask Playbook for a signed destination.
 * Exposed on its own because the browser does the PUT itself — the bytes of a
 * finished design never pass through a Vercel function, which is what keeps
 * deliverables clear of the 100MB request-body cap. `uploadAsset` below uses it
 * internally for the server-side path, where the caller already holds the bytes.
 */
export async function prepareUpload({
  title,
  mediaType,
  size,
  boardToken,
}: {
  title: string;
  mediaType: string;
  size: number;
  boardToken: string;
}): Promise<UploadPrepareResponse> {
  const res = (await pbFetch("/assets/upload_prepare", {
    method: "POST",
    body: JSON.stringify({
      asset: { title, media_type: mediaType, size, collection_token: boardToken },
    }),
  })) as { data: UploadPrepareResponse };
  return res.data;
}
/** Step 3: materialize the asset record once the bytes have been PUT to storage. */
export async function completeUpload({
  signedGcsId,
  multipartUploadId,
  title,
  mediaType,
  size,
  boardToken,
}: {
  signedGcsId: string;
  multipartUploadId?: string;
  title: string;
  mediaType: string;
  size: number;
  boardToken: string;
}): Promise<PlaybookAsset> {
  const res = (await pbFetch("/assets/upload_complete", {
    method: "POST",
    body: JSON.stringify({
      asset: {
        signed_gcs_id: signedGcsId,
        ...(multipartUploadId ? { multipart_upload_id: multipartUploadId } : {}),
        title,
        media_type: mediaType,
        size,
        collection_token: boardToken,
      },
    }),
  })) as { data: PlaybookAsset };
  return res.data;
}
/**
 * Upload one file's bytes and return the resulting asset. Handles all three
 * shapes `upload_prepare` can hand back — GCS resumable, Backblaze single-part,
 * Backblaze multipart — since which one applies depends on the org's storage
 * provider and file size, not on anything this caller controls.
 *
 * Kept for server-side callers that already hold the bytes. The design ticket
 * uploader does not use it: it goes through prepareUpload/completeUpload and
 * lib/directUpload.ts so a 300MB print-ready PDF never touches our server.
 */
export async function uploadAsset({
  buffer,
  title,
  mediaType,
  boardToken,
}: {
  buffer: Buffer;
  title: string;
  mediaType: string;
  boardToken: string;
}): Promise<PlaybookAsset> {
  const p = await prepareUpload({ title, mediaType, size: buffer.length, boardToken });

  if (p.storage_provider === "gcs") {
    // Resumable protocol: an empty POST opens a session (Location header),
    // then the bytes go to that session URL — neither call carries our
    // Authorization header, since the signed URL itself is the credential.
    if (!p.upload_url) throw new Error("Playbook upload_prepare (gcs) returned no upload_url");
    const startRes = await fetch(p.upload_url, {
      method: "POST",
      headers: {
        "Content-Type": mediaType,
        "x-goog-resumable": "start",
        ...(p.encrypted_organization_metadata
          ? { "x-goog-meta-encrypted-organization-metadata": p.encrypted_organization_metadata }
          : {}),
        "x-goog-meta-extension": p.file_extension,
      },
    });
    const sessionUrl = startRes.headers.get("location");
    if (!startRes.ok || !sessionUrl) {
      throw new Error(`Playbook GCS resumable session start failed: ${startRes.status}`);
    }
    await putBytes(sessionUrl, buffer, { "Content-Type": mediaType });
  } else if (p.multipart_upload_id && p.parts && p.part_size) {
    // Backblaze multipart (files >=5MB): slice the buffer into the exact
    // part boundaries the server chose, in order. No auth/meta headers on
    // the part PUTs — same reasoning as the GCS session URL above.
    for (const part of p.parts.sort((a, b) => a.part_number - b.part_number)) {
      const start = (part.part_number - 1) * p.part_size;
      const chunk = buffer.subarray(start, start + p.part_size);
      await putBytes(part.url, Buffer.from(chunk), {});
    }
  } else {
    // Backblaze single-part.
    if (!p.upload_url) throw new Error("Playbook upload_prepare (backblaze) returned no upload_url");
    await putBytes(p.upload_url, buffer, {
      "Content-Type": mediaType,
      "x-amz-meta-extension": p.file_extension,
      ...(p.encrypted_organization_metadata
        ? { "x-amz-meta-encrypted-organization-metadata": p.encrypted_organization_metadata }
        : {}),
    });
  }

  return completeUpload({
    signedGcsId: p.signed_gcs_id,
    multipartUploadId: p.multipart_upload_id,
    title,
    mediaType,
    size: buffer.length,
    boardToken,
  });
}

/**
 * A short-lived (~24h) signed URL. Minted per download and handed to the
 * browser as a redirect — never persisted, logged, or put in an email, where it
 * would expire and read as data loss.
 */
export async function getTemporaryDisplayUrl(assetToken: string): Promise<string | null> {
  const res = (await pbFetch(`/assets/${assetToken}`)) as { data: PlaybookAsset };
  return res.data.display_url;
}

export async function deleteAsset(assetToken: string): Promise<void> {
  await pbFetch(`/assets/${assetToken}`, { method: "DELETE" });
}
