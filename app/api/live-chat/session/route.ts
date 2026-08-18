// The room for the service that's on air now.
//
// The panel on /live calls this on mount to find out whether there's a chat to
// join, what state it's in, and which topics to subscribe to. It also opens the
// room on first contact — see getOrOpenCurrentSession(), which gates that on the
// YouTube live check so this can't be used to spam rows into the table.

import { NextResponse } from "next/server";
import { getOrOpenCurrentSession } from "@/lib/liveChat.server";
import { readGuest, readHost } from "@/lib/liveChatAuth";
import { publicTopic, hostTopic, dmTopic } from "@/lib/liveChatGuest";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getOrOpenCurrentSession();

  if (!session) {
    return NextResponse.json(
      { session: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const [guest, host] = await Promise.all([readGuest(), readHost()]);

  return NextResponse.json(
    {
      session: {
        id: session.id,
        title: session.title,
        state: session.state,
      },
      topics: {
        public: publicTopic(session.id),
        // A guest's own DM topic is theirs to subscribe to; the key is derived
        // from their signed cookie, so it can only ever be their own thread.
        dm: guest ? dmTopic(session.id, guest.id) : null,
        host: host ? hostTopic(session.id) : null,
      },
      guest: guest ? { id: guest.id, name: guest.name } : null,
      isHost: Boolean(host),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
