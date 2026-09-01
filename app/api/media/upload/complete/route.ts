import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { completeUpload, deleteAsset } from "@/lib/playbook.server";
import {
  clientIp,
  hashIp,
  isRateLimited,
  resolveUploadBoard,
  sanitizeUploaderName,
} from "@/lib/mediaUpload.server";

// Step 3 of the browser-direct video upload — called once the browser has
// PUT the bytes straight to Playbook's storage (see .../upload/prepare).
// Re-validates the board and rate limit rather than trusting that nothing
// changed since prepare (a board could have been switched off in between,
// or the same visitor could have burned through their hourly cap with other
// uploads while this one was in flight).
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const boardToken = body.board_token;
  const uploaderName = sanitizeUploaderName(body.uploader_name);
  const fileName = typeof body.file_name === "string" ? body.file_name.slice(0, 255) : "";
  const mediaType = body.media_type;
  const size = Number(body.size);
  const signedGcsId = body.signed_gcs_id;
  const multipartUploadId =
    typeof body.multipart_upload_id === "string" ? body.multipart_upload_id : undefined;

  if (typeof boardToken !== "string" || !boardToken) {
    return NextResponse.json({ error: "Missing board" }, { status: 400 });
  }
  if (!uploaderName) {
    return NextResponse.json({ error: "Your name is required" }, { status: 400 });
  }
  if (!fileName || typeof mediaType !== "string" || !Number.isFinite(size) || size <= 0) {
    return NextResponse.json({ error: "Missing upload details" }, { status: 400 });
  }
  if (typeof signedGcsId !== "string" || !signedGcsId) {
    return NextResponse.json({ error: "Missing upload reference" }, { status: 400 });
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

  let asset;
  try {
    asset = await completeUpload({
      signedGcsId,
      multipartUploadId,
      title: fileName,
      mediaType,
      size,
      boardToken: board.playbookBoardToken,
    });
  } catch (err) {
    console.error("⚠️ Playbook upload_complete failed:", err);
    return NextResponse.json({ error: "Upload failed — please try again" }, { status: 502 });
  }

  const { error: insertError } = await createServiceClient().from("media_photos").insert({
    board_id: board.id,
    file_name: fileName,
    mime_type: mediaType,
    size_bytes: size,
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
    message: "Thanks! It'll appear once approved.",
  });
}
