// DestinyAI in Destiny Admin: one chat turn.
//
// Open to every admin (lib/adminRoles.ts OPEN_PATHS) because what it can do is
// decided per tool: each one checks the same access rule its admin page's API
// has, and the handlers it calls keep their own checks.

import { NextResponse } from "next/server";
import { runTurn } from "@/lib/adminAgent/agent.server";
import { AgentError, currentActor } from "@/lib/adminAgent/context.server";
import type { ChatMessage } from "@/lib/adminAgent/types";

// Several tool rounds against Claude plus ChurchSuite reads.
export const maxDuration = 60;

export async function POST(request: Request) {
  // audit-exempt: a turn only reads the site and drafts a plan; nothing on the site changes until the plan is confirmed at /api/admin/assistant/plans/[id], which is audited (and so is every step it runs).
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "Sign in again." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { messages?: ChatMessage[] } | null;
  if (!Array.isArray(body?.messages)) {
    return NextResponse.json({ error: "Send the conversation as messages." }, { status: 400 });
  }

  try {
    return NextResponse.json(await runTurn(actor, body.messages));
  } catch (err) {
    if (err instanceof AgentError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("⚠️ DestinyAI admin route:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
