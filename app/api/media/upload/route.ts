import { NextResponse } from "next/server";
import sharp from "sharp";
import { createServiceClient } from "@/utils/supabase/service";
import { deleteAsset, uploadAsset } from "@/lib/playbook.server";
import {
  clientIp,
  hashIp,
  isHoneypotTripped,
  isRateLimited,
  resolveUploadBoard,
  sanitizeUploaderName,
} from "@/lib/mediaUpload.server";

// Anonymous public upload — outside middleware's matcher entirely (see
// middleware.ts's config.matcher), so there is no auth wall here at all.
// Everything a signed-in admin route gets for free (a known actor, RLS,
// role gating) has to be done by hand in this one handler instead.
//
// Images only. Video goes through app/api/media/upload/{prepare,complete}
// instead — a browser-direct upload to Playbook's storage, so a large clip's
// bytes never have to pass through this (or any) Vercel Function at all,
// unlike this route, which receives the whole file in the request body and
// so is bound by Vercel's 100MB body cap regardless of anything this app
// does. Images stay small enough (10MB) that the simpler server-proxied
// path — needed anyway so sharp can strip EXIF/GPS metadata server-side —
// is the right one for them.
//
// No recordAudit() call: audit entries are attributed to an admin actor via
// the x-dc-actor-* headers middleware sets, and this route never runs behind
// that middleware, so there is no actor to name. tests/unit/audit-coverage.spec.ts
// only walks app/api/admin/**, so this route isn't subject to that check —
// left as-is deliberately rather than papering over it with a misleading
// "audit-exempt" comment that rule doesn't actually apply to.

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const form = await request.formData();

  const honeypot = form.get("website");
  if (isHoneypotTripped(honeypot)) {
    return NextResponse.json({
      status: "pending",
      message: "Thanks! It'll appear once approved.",
    });
  }

  const file = form.get("file");
  const boardToken = form.get("board_token");
  const uploaderName = sanitizeUploaderName(form.get("uploader_name"));

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (typeof boardToken !== "string" || !boardToken) {
    return NextResponse.json({ error: "Missing board" }, { status: 400 });
  }
  if (!uploaderName) {
    return NextResponse.json({ error: "Your name is required" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
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

  // Re-encode through sharp rather than storing the upload as-is. Two reasons:
  // it strips EXIF/XMP/ICC metadata (phone photos routinely carry GPS coordinates —
  // a public upload leaking exactly where the uploader lives is a real privacy risk,
  // not a theoretical one), and it doubles as a content check: a file with a spoofed
  // image/* MIME type that isn't actually a decodable image throws here instead of
  // being stored. `.rotate()` with no args applies the EXIF orientation as a real
  // pixel transform first — otherwise stripping that same tag would leave portrait
  // phone photos rotated sideways.
  let processed: Buffer;
  let width: number;
  let height: number;
  try {
    const pixels = sharp(Buffer.from(await file.arrayBuffer())).rotate();
    const encoded =
      file.type === "image/png"
        ? pixels.png()
        : file.type === "image/webp"
          ? pixels.webp({ quality: 90 })
          : pixels.jpeg({ quality: 90 });
    const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
    processed = data;
    width = info.width;
    height = info.height;
  } catch {
    return NextResponse.json({ error: "That file isn't a valid image" }, { status: 400 });
  }

  const extFallback = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = file.name.slice(0, 255) || `photo.${extFallback}`;

  let asset;
  try {
    asset = await uploadAsset({
      buffer: processed,
      title: fileName,
      mediaType: file.type,
      boardToken: board.playbookBoardToken,
    });
  } catch (err) {
    console.error("⚠️ Playbook upload failed:", err);
    return NextResponse.json({ error: "Upload failed — please try again" }, { status: 502 });
  }

  const { error: insertError } = await createServiceClient().from("media_photos").insert({
    board_id: board.id,
    file_name: fileName,
    mime_type: file.type,
    size_bytes: processed.length,
    width,
    height,
    uploader_name: uploaderName,
    uploader_ip_hash: ipHash,
    status: "pending",
    playbook_asset_token: asset.token,
  });

  if (insertError) {
    await deleteAsset(asset.token).catch(() => {});
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    status: "pending",
    message: "Thanks! Your photo will appear once approved.",
  });
}
