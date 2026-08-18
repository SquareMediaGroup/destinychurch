// Read and write the simulated live broadcast, from /admin/live.
//
// Gated by middleware.ts + ROUTE_RULES (`host` — the same people who run the
// chat on a Sunday), so there is no auth code in this file by design; see the
// comment at the top of app/api/admin/nfc/route.ts.
//
// The logic lives in lib/simulatedLiveControl.server.ts and is shared with
// /api/live-control, the copy of these controls that sits on /live itself.

import { NextResponse } from "next/server";
import {
  clearSimulatedLive,
  readSimulatedLive,
  writeSimulatedLive,
} from "@/lib/simulatedLiveControl.server";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const result = await readSimulatedLive();
  return result.ok
    ? NextResponse.json(result.data, { headers: NO_STORE })
    : NextResponse.json({ error: result.error }, { status: result.status });
}

export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = await writeSimulatedLive(body);
  return result.ok
    ? NextResponse.json(result.data, { headers: NO_STORE })
    : NextResponse.json({ error: result.error }, { status: result.status });
}

/** Remove the scheduled service outright, rather than just taking it off air. */
export async function DELETE() {
  const result = await clearSimulatedLive();
  return result.ok
    ? NextResponse.json(result.data, { headers: NO_STORE })
    : NextResponse.json({ error: result.error }, { status: result.status });
}
