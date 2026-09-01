import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { createServiceClient } from "@/utils/supabase/service";
import { deleteAsset, getOrCreateBoard, uploadAsset } from "@/lib/playbook.server";

// Anonymous public upload — outside middleware's matcher entirely (see
// middleware.ts's config.matcher), so there is no auth wall here at all.
// Everything a signed-in admin route gets for free (a known actor, RLS,
// role gating) has to be done by hand in this one handler instead.
//
// No recordAudit() call: audit entries are attributed to an admin actor via
// the x-dc-actor-* headers middleware sets, and this route never runs behind
// that middleware, so there is no actor to name. tests/unit/audit-coverage.spec.ts
// only walks app/api/admin/**, so this route isn't subject to that check —
// left as-is deliberately rather than papering over it with a misleading
// "audit-exempt" comment that rule doesn't actually apply to.

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 10 * 1024 * 1024; // 10MB, matches the bucket's file_size_limit
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_UPLOADS_PER_HOUR = 20;

function hashIp(ip: string): string {
  return createHash("sha256").update(ip + (process.env.MEDIA_IP_SALT ?? "")).digest("hex");
}

export async function POST(request: Request) {
  const form = await request.formData();

  // Honeypot: real visitors never fill this in. A bot that does gets told it
  // worked, so it has no signal to adapt to, but nothing is actually saved.
  const honeypot = form.get("website");
  if (typeof honeypot === "string" && honeypot.trim().length > 0) {
    return NextResponse.json({
      status: "pending",
      message: "Thanks! Your photo will appear once approved.",
    });
  }

  const file = form.get("file");
  const boardToken = form.get("board_token");
  const uploaderNameRaw = form.get("uploader_name");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (typeof boardToken !== "string" || !boardToken) {
    return NextResponse.json({ error: "Missing board" }, { status: 400 });
  }
  if (typeof uploaderNameRaw !== "string" || uploaderNameRaw.trim().length === 0) {
    return NextResponse.json({ error: "Your name is required" }, { status: 400 });
  }

  const uploaderName = uploaderNameRaw
    .replace(new RegExp("[\x00-\x1f\x7f]", "g"), "")
    .trim()
    .slice(0, 100);

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: board } = await supabase
    .from("media_boards")
    .select("id, title, allow_uploads, playbook_board_token")
    .eq("share_token", boardToken)
    .maybeSingle();

  if (!board) return NextResponse.json({ error: "Board not found" }, { status: 404 });
  if (!board.allow_uploads) {
    return NextResponse.json({ error: "This board isn't accepting uploads" }, { status: 403 });
  }

  // Lazily provisioned rather than at board-creation time only, so a board
  // created before this column existed still gets a Playbook board on its
  // first upload instead of erroring forever.
  let playbookBoardToken = board.playbook_board_token;
  if (!playbookBoardToken) {
    playbookBoardToken = await getOrCreateBoard(board.title);
    await supabase
      .from("media_boards")
      .update({ playbook_board_token: playbookBoardToken })
      .eq("id", board.id);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ipHash = hashIp(ip);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("media_photos")
    .select("id", { count: "exact", head: true })
    .eq("uploader_ip_hash", ipHash)
    .gte("created_at", oneHourAgo);

  if ((count ?? 0) >= MAX_UPLOADS_PER_HOUR) {
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
  let info: sharp.OutputInfo;
  try {
    const pixels = sharp(Buffer.from(await file.arrayBuffer())).rotate();
    const encoded =
      file.type === "image/png"
        ? pixels.png()
        : file.type === "image/webp"
          ? pixels.webp({ quality: 90 })
          : pixels.jpeg({ quality: 90 });
    ({ data: processed, info } = await encoded.toBuffer({ resolveWithObject: true }));
  } catch {
    return NextResponse.json({ error: "That file isn't a valid image" }, { status: 400 });
  }

  const fileName = file.name.slice(0, 255) || `photo.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;

  let asset;
  try {
    asset = await uploadAsset({
      buffer: processed,
      title: fileName,
      mediaType: file.type,
      boardToken: playbookBoardToken,
    });
  } catch (err) {
    console.error("⚠️ Playbook upload failed:", err);
    return NextResponse.json({ error: "Upload failed — please try again" }, { status: 502 });
  }

  const { error: insertError } = await supabase.from("media_photos").insert({
    board_id: board.id,
    file_name: fileName,
    mime_type: file.type,
    size_bytes: processed.length,
    width: info.width,
    height: info.height,
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
