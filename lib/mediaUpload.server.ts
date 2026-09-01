// Shared validation for /media's public upload routes — the plain
// server-proxied image path (app/api/media/upload) and the browser-direct
// video path (app/api/media/upload/{prepare,complete}). Kept in one place so
// "does this board accept uploads", "has this IP hit its hourly cap", and "is
// this a real name" are answered identically regardless of which path a
// given upload takes.
import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/utils/supabase/service";
import { getOrCreateBoard } from "@/lib/playbook.server";

export const MAX_UPLOADS_PER_HOUR = 20;

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip + (process.env.MEDIA_IP_SALT ?? "")).digest("hex");
}

export function sanitizeUploaderName(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim().length === 0) return null;
  return raw
    .replace(new RegExp("[\x00-\x1f\x7f]", "g"), "")
    .trim()
    .slice(0, 100);
}

/** True if the honeypot field was filled in — real visitors never see or fill it. */
export function isHoneypotTripped(raw: unknown): boolean {
  return typeof raw === "string" && raw.trim().length > 0;
}

export interface UploadBoard {
  id: string;
  title: string;
  playbookBoardToken: string;
}

/**
 * Resolves a board by its public share token, checks it accepts uploads, and
 * lazily provisions its Playbook board if an older row is missing one.
 * Returns null for "not found" and a string for any other rejection reason,
 * so callers can turn either into the right HTTP response without repeating
 * this lookup.
 */
export async function resolveUploadBoard(
  boardToken: string,
): Promise<{ board: UploadBoard } | { error: string } | null> {
  const supabase = createServiceClient();
  const { data: board } = await supabase
    .from("media_boards")
    .select("id, title, allow_uploads, playbook_board_token")
    .eq("share_token", boardToken)
    .maybeSingle();

  if (!board) return null;
  if (!board.allow_uploads) return { error: "This board isn't accepting uploads" };

  let playbookBoardToken = board.playbook_board_token;
  if (!playbookBoardToken) {
    playbookBoardToken = await getOrCreateBoard(board.title);
    await supabase
      .from("media_boards")
      .update({ playbook_board_token: playbookBoardToken })
      .eq("id", board.id);
  }

  return { board: { id: board.id, title: board.title, playbookBoardToken } };
}

/** Whether this IP hash has already hit the hourly upload cap. */
export async function isRateLimited(ipHash: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await createServiceClient()
    .from("media_photos")
    .select("id", { count: "exact", head: true })
    .eq("uploader_ip_hash", ipHash)
    .gte("created_at", oneHourAgo);
  return (count ?? 0) >= MAX_UPLOADS_PER_HOUR;
}
