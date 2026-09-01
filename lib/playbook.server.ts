// Playbook (dev.playbook.com) — the DAM that stores /media's photos.
//
// Replaces Supabase Storage for this one feature only (see REPOSITORY_DOCUMENTATION.md's
// Database Schema §25) — every other bucket (popup-images, post-media, hr-documents,
// shop-hero-images, product-images) is untouched.
//
// Auth: PLAYBOOK_TOKEN (Bearer token, write scope). Org: PLAYBOOK_ORG_SLUG, defaulting to
// "dctv" (Destiny Church Tees Valley's Pro-plan workspace — confirmed via GET /organizations;
// the account also has a second, unrelated free-plan "destinytees" workspace with only 10
// permalinks total, which is why the slug is not left to be guessed at request time).
//
// Two URL lifetimes matter here, and mixing them up is the whole failure mode this file
// exists to prevent:
//   - `display_url` / thumbnails: SIGNED, expire in ~24h. Fine for the admin moderation
//     queue (reviewed within minutes), never for anything stored in our own database.
//   - `permalink`: unsigned, never expires, but capped by plan (Pro = 1,000) and must be
//     requested explicitly via add_permalinks. Only called on approval, never on upload —
//     a rejected or still-pending photo never needed a permanent URL and shouldn't spend
//     the cap on one.
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

/* ── Upload (two-step: prepare, PUT bytes, complete) ─────────────────────────── */

interface UploadPrepareResponse {
  storage_provider: "gcs" | "backblaze";
  upload_url?: string;
  signed_gcs_id: string;
  file_extension: string;
  encrypted_organization_metadata?: string;
  multipart_upload_id?: string;
  part_size?: number;
  parts?: { part_number: number; url: string }[];
}

interface PlaybookAsset {
  id: number;
  token: string;
  title: string;
  media_type: string | null;
  is_skeleton: boolean;
  permalink: string | null;
  display_url: string | null;
}

async function putBytes(url: string, buffer: Buffer, headers: Record<string, string>) {
  const res = await fetch(url, { method: "PUT", body: new Uint8Array(buffer), headers });
  if (!res.ok) {
    throw new Error(`Upload PUT to storage failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  return res;
}

/**
 * Upload one file's bytes and return the resulting asset. Handles all three
 * shapes `upload_prepare` can hand back — GCS resumable, Backblaze single-part,
 * Backblaze multipart — since which one applies depends on the org's storage
 * provider and file size, not on anything this caller controls.
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
  const prepare = (await pbFetch("/assets/upload_prepare", {
    method: "POST",
    body: JSON.stringify({
      asset: { title, media_type: mediaType, size: buffer.length, collection_token: boardToken },
    }),
  })) as { data: UploadPrepareResponse };
  const p = prepare.data;

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

  const complete = (await pbFetch("/assets/upload_complete", {
    method: "POST",
    body: JSON.stringify({
      asset: {
        signed_gcs_id: p.signed_gcs_id,
        ...(p.multipart_upload_id ? { multipart_upload_id: p.multipart_upload_id } : {}),
        title,
        media_type: mediaType,
        size: buffer.length,
        collection_token: boardToken,
      },
    }),
  })) as { data: PlaybookAsset };

  return complete.data;
}

/** A short-lived (~24h) URL — fine for the admin queue, never for storage. */
export async function getTemporaryDisplayUrl(assetToken: string): Promise<string | null> {
  const res = (await pbFetch(`/assets/${assetToken}`)) as { data: PlaybookAsset };
  return res.data.display_url;
}

/** A permanent, unsigned CDN URL. Spends one of the org's plan-capped permalinks. */
export async function createPermalink(assetToken: string): Promise<string> {
  const res = (await pbFetch("/assets/add_permalinks", {
    method: "POST",
    body: JSON.stringify({ asset_tokens: [assetToken] }),
  })) as { data: PlaybookAsset[] };
  const permalink = res.data[0]?.permalink;
  if (!permalink) throw new Error("Playbook add_permalinks returned no permalink");
  return permalink;
}

export async function deleteAsset(assetToken: string): Promise<void> {
  await pbFetch(`/assets/${assetToken}`, { method: "DELETE" });
}

export async function deleteBoard(boardToken: string): Promise<void> {
  await pbFetch(`/boards/${boardToken}`, { method: "DELETE" });
}
