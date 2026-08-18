// Who the chat panel is talking to.
//
// Called on mount and again after a Host signs in through the popup. Everything
// here is derived server-side — the client cannot tell us it's a host, it can
// only ask.
//
// NOTE: /api/live-chat/* is NOT covered by middleware.ts (its matcher is
// /admin/* and /api/admin/*), so this route authorises itself via
// lib/liveChatAuth.ts. Every route in this folder must do the same.

import { NextResponse } from "next/server";
import { readGuest, readHost } from "@/lib/liveChatAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [guest, host] = await Promise.all([readGuest(), readHost()]);

  return NextResponse.json(
    {
      guest: guest ? { id: guest.id, name: guest.name } : null,
      host: host ? { name: host.name } : null,
      isHost: Boolean(host),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
