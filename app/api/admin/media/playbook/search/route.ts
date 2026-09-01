import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { searchAssets } from "@/lib/playbook.server";

/** Natural-language search across the whole org — an alternative to browsing a board. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  if (!query) return NextResponse.json({ error: "q is required" }, { status: 400 });

  let assets;
  try {
    assets = await searchAssets(query);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach Playbook" },
      { status: 502 },
    );
  }

  const tokens = assets.map((a) => a.token);
  const { data: imported } = await createServiceClient()
    .from("media_photos")
    .select("playbook_asset_token")
    .in("playbook_asset_token", tokens);
  const importedSet = new Set((imported ?? []).map((r) => r.playbook_asset_token));

  return NextResponse.json(
    assets.map((a) => ({ ...a, alreadyImported: importedSet.has(a.token) })),
  );
}
