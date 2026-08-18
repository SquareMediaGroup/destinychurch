// Running the broadcast from /live itself, without going to /admin.
//
// ⚠️ NOT covered by middleware.ts (its matcher is /admin/* and /api/admin/*).
// These routes hang off a public page, exactly like /api/live-chat/*, so they
// authorise themselves via lib/liveChatAuth.ts. Every handler here must begin
// with requireHost(); one that reads a body before establishing the caller is a
// bug. See the comment at the top of lib/liveChatAuth.ts.
//
// The logic is shared with /api/admin/simulated-live — same row, same rules,
// one implementation in lib/simulatedLiveControl.server.ts.

import { NextResponse } from "next/server";
import { requireHost } from "@/lib/liveChatAuth";
import {
  clearSimulatedLive,
  readSimulatedLive,
  writeSimulatedLive,
  type ControlResult,
} from "@/lib/simulatedLiveControl.server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function respond(result: ControlResult) {
  return result.ok
    ? NextResponse.json(result.data, { headers: NO_STORE })
    : NextResponse.json({ error: result.error }, { status: result.status });
}

function denied(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "Sign in to run the broadcast." : "Hosts only." },
    { status, headers: NO_STORE }
  );
}

export async function GET() {
  const auth = await requireHost();
  if (!auth.ok) return denied(auth.status);
  return respond(await readSimulatedLive());
}

export async function PUT(request: Request) {
  const auth = await requireHost();
  if (!auth.ok) return denied(auth.status);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  return respond(await writeSimulatedLive(body));
}

/** Remove the scheduled service outright, rather than just taking it off air. */
export async function DELETE() {
  const auth = await requireHost();
  if (!auth.ok) return denied(auth.status);
  return respond(await clearSimulatedLive());
}
