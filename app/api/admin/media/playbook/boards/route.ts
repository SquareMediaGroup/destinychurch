import { NextResponse } from "next/server";
import { listBoards } from "@/lib/playbook.server";

/** Every board already in Playbook — the "import from" picker's source list. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? undefined;

  try {
    const boards = await listBoards(query);
    return NextResponse.json(boards);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to reach Playbook" },
      { status: 502 },
    );
  }
}
