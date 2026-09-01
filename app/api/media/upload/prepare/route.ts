import { NextResponse } from "next/server";
import { prepareUpload } from "@/lib/playbook.server";
import {
  clientIp,
  hashIp,
  isHoneypotTripped,
  isRateLimited,
  resolveUploadBoard,
  sanitizeUploaderName,
} from "@/lib/mediaUpload.server";

// Step 1 of the browser-direct video upload: validates the request the same
// way the image route does, then asks Playbook for a signed upload
// destination and hands it straight back to the browser. The actual bytes
// never touch this route (or any Vercel Function) — the browser PUTs them
// directly to the URL(s) returned here, then calls
// app/api/media/upload/complete/route.ts once that's done. This is the
// whole reason video isn't bound by Vercel's 100MB request-body cap the way
// the image route is.
export const runtime = "nodejs";
export const maxDuration = 30;

// Generous, but not unbounded — this is still an anonymous, unauthenticated
// endpoint, and a size cap here is one more lever against someone trying to
// run up the org's Playbook storage even though the upload itself bypasses
// our own server.
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (isHoneypotTripped(body.website)) {
    // Same shape as a real success — a bot filling this in learns nothing.
    return NextResponse.json({ honeypot: true });
  }

  const boardToken = body.board_token;
  const uploaderName = sanitizeUploaderName(body.uploader_name);
  const fileName = typeof body.file_name === "string" ? body.file_name.slice(0, 255) : "";
  const mediaType = body.media_type;
  const size = Number(body.size);

  if (typeof boardToken !== "string" || !boardToken) {
    return NextResponse.json({ error: "Missing board" }, { status: 400 });
  }
  if (!uploaderName) {
    return NextResponse.json({ error: "Your name is required" }, { status: 400 });
  }
  if (!fileName) {
    return NextResponse.json({ error: "Missing file name" }, { status: 400 });
  }
  if (typeof mediaType !== "string" || !ALLOWED_VIDEO_TYPES.has(mediaType)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Missing file size" }, { status: 400 });
  }
  if (size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${Math.round(MAX_VIDEO_BYTES / (1024 * 1024))}MB limit` },
      { status: 413 },
    );
  }

  const resolved = await resolveUploadBoard(boardToken);
  if (!resolved) return NextResponse.json({ error: "Board not found" }, { status: 404 });
  if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: 403 });
  const { board } = resolved;

  const ipHash = hashIp(clientIp(request));
  if (await isRateLimited(ipHash)) {
    return NextResponse.json(
      { error: "Too many uploads — please try again later" },
      { status: 429 },
    );
  }

  let prepared;
  try {
    prepared = await prepareUpload({
      title: fileName,
      mediaType,
      size,
      boardToken: board.playbookBoardToken,
    });
  } catch (err) {
    console.error("⚠️ Playbook upload_prepare failed:", err);
    return NextResponse.json({ error: "Upload failed — please try again" }, { status: 502 });
  }

  return NextResponse.json({
    storageProvider: prepared.storage_provider,
    uploadUrl: prepared.upload_url ?? null,
    signedGcsId: prepared.signed_gcs_id,
    fileExtension: prepared.file_extension,
    encryptedOrganizationMetadata: prepared.encrypted_organization_metadata ?? null,
    multipartUploadId: prepared.multipart_upload_id ?? null,
    partSize: prepared.part_size ?? null,
    parts: prepared.parts ?? null,
  });
}
