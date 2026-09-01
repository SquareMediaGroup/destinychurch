import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { getOrCreateBoard } from "@/lib/playbook.server";
import { hashPassword } from "@/lib/mediaAccess";

export async function GET() {
  const supabase = createServiceClient();
  // password_hash excluded deliberately: even to an admin session, there's no
  // reason a hash needs to leave the server — the UI only ever needs to know
  // whether one is set (has_password, computed below).
  const { data: boards, error } = await supabase
    .from("media_boards")
    .select(
      "id, title, slug, description, cover_photo_id, is_public, share_token, allow_uploads, playbook_board_token, password_hash, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: photos } = await supabase
    .from("media_photos")
    .select("board_id, status");

  const counts = new Map<string, { pending: number; approved: number; rejected: number }>();
  for (const photo of photos ?? []) {
    const c = counts.get(photo.board_id) ?? { pending: 0, approved: 0, rejected: 0 };
    c[photo.status as "pending" | "approved" | "rejected"]++;
    counts.set(photo.board_id, c);
  }

  const withCounts = (boards ?? []).map(({ password_hash, ...board }) => ({
    ...board,
    has_password: Boolean(password_hash),
    counts: counts.get(board.id) ?? { pending: 0, approved: 0, rejected: 0 },
  }));

  return NextResponse.json(withCounts);
}

export async function POST(request: Request) {
  const { title, slug, description, is_public, allow_uploads, password } = await request.json();

  if (!title || !slug) {
    return NextResponse.json({ error: "title and slug are required" }, { status: 400 });
  }

  const trimmedTitle = String(title).trim();

  // Created eagerly here rather than left entirely to the upload route's lazy
  // fallback, so a board shows up in Playbook (and is findable/organizable
  // there) the moment it's created, not only after its first photo lands.
  let playbookBoardToken: string | null = null;
  try {
    playbookBoardToken = await getOrCreateBoard(trimmedTitle);
  } catch (err) {
    console.error("⚠️ Could not create the matching Playbook board:", err);
    // Not fatal — app/api/media/upload/route.ts provisions one lazily on
    // first upload if this is still null.
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("media_boards")
    .insert({
      title: trimmedTitle,
      slug: String(slug).trim().toLowerCase(),
      description: description || null,
      is_public: is_public !== false,
      allow_uploads: allow_uploads !== false,
      playbook_board_token: playbookBoardToken,
      password_hash: password ? hashPassword(String(password)) : null,
    })
    .select("id, title, slug, description, cover_photo_id, is_public, share_token, allow_uploads, playbook_board_token, password_hash, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "create",
    section: "media",
    entity: "board",
    entityId: data.id,
    entityLabel: data.title,
    summary: `Created the ${data.is_public ? "public" : "private"} photo board "${data.title}"${password ? ", password-protected" : ""}`,
    after: data,
    redactFields: ["password_hash"],
  });

  const { password_hash, ...board } = data;
  return NextResponse.json({ ...board, has_password: Boolean(password_hash) }, { status: 201 });
}
