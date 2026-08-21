import { NextResponse } from "next/server";
import { readPortalUser } from "@/lib/staffPortalAuth";

// middleware.ts already confirms the caller is a linked staff member before
// this runs, but readPortalUser() is called again here (not trusted from
// middleware) so this route never depends on request state it can't verify
// itself.
export async function GET() {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(identity.staff);
}
