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
import { recordAudit } from "@/lib/audit.server";

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

  const before = await readSimulatedLive();
  const result = await writeSimulatedLive(body);

  if (result.ok) {
    const wasActive = before.ok && before.data.active;
    await recordAudit({
      action: "update",
      section: "live",
      entity: "simulated broadcast",
      entityId: result.data.videoId ?? null,
      entityLabel: result.data.title ?? "Simulated live",
      summary: `${
        result.data.active && !wasActive
          ? "Scheduled"
          : !result.data.active && wasActive
            ? "Took off air"
            : "Edited"
      } the simulated broadcast “${result.data.title ?? "untitled"}”${
        result.data.startsAt ? ` starting ${result.data.startsAt}` : ""
      }`,
      before: before.ok ? { ...before.data } : null,
      after: { ...result.data },
    });
  }

  return result.ok
    ? NextResponse.json(result.data, { headers: NO_STORE })
    : NextResponse.json({ error: result.error }, { status: result.status });
}

/** Remove the scheduled service outright, rather than just taking it off air. */
export async function DELETE() {
  const before = await readSimulatedLive();
  const result = await clearSimulatedLive();

  if (result.ok) {
    await recordAudit({
      action: "delete",
      section: "live",
      entity: "simulated broadcast",
      entityId: before.ok ? before.data.videoId ?? null : null,
      entityLabel: before.ok ? before.data.title ?? "Simulated live" : "Simulated live",
      summary: `Cleared the scheduled simulated broadcast${
        before.ok && before.data.title ? ` “${before.data.title}”` : ""
      }`,
      before: before.ok ? { ...before.data } : null,
    });
  }

  return result.ok
    ? NextResponse.json(result.data, { headers: NO_STORE })
    : NextResponse.json({ error: result.error }, { status: result.status });
}
