// "What is this link?" — the preview behind the URL field on /admin/live, so a
// mistyped video is caught while pasting rather than at 11am on Sunday.
//
// Gated by middleware.ts. The mirror of this route for the controls on /live is
// /api/live-control/lookup, which authorises itself.

import { lookupResponse } from "@/lib/simulatedLiveLookup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return lookupResponse(new URL(request.url).searchParams.get("url") ?? "");
}
