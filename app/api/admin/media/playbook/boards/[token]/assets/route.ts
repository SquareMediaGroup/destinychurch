import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { listBoardAssets } from "@/lib/playbook.server";

/**
 * A Playbook board's assets, for the import picker — each row flagged with
 * whether it's already been imported, so re-opening a board an admin
 * partially imported before doesn't invite duplicate imports.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token: boardToken } = await params;
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1") || 1;

  let result;
  try {
    result = await listBoardAssets(boardToken, { page });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach Playbook" },
      { status: 502 },
    );
  }

  const tokens = result.assets.map((a) => a.token);
  const { data: imported } = await createServiceClient()
    .from("media_photos")
    .select("playbook_asset_token")
    .in("playbook_asset_token", tokens);
  const importedSet = new Set((imported ?? []).map((r) => r.playbook_asset_token));

  return NextResponse.json({
    assets: result.assets.map((a) => ({ ...a, alreadyImported: importedSet.has(a.token) })),
    hasMore: result.hasMore,
  });
}
