import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import {
  applyTransition,
  getTicketByToken,
  requesterView,
  type TicketRow,
} from "@/lib/designTickets.server";
import { sendChangesRequestedAlert } from "@/lib/designEmail";
import type { DesignTicketStatus } from "@/lib/designTickets";

// The requester's own view of their ticket, reached by share token rather than
// a login. Public by design — the token is the credential — so everything here
// is written on the assumption that the URL may end up somewhere it shouldn't:
// no other ticket is reachable, and requesterView hand-picks the fields.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createServiceClient();

  const ticket = await getTicketByToken(supabase, token);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(await requesterView(supabase, ticket as TicketRow), {
    headers: { "Cache-Control": "no-store" },
  });
}

// The only two moves a requester gets. Anything else posted here is rejected by
// canTransition regardless — this list just fails it earlier and more clearly.
const REQUESTER_MOVES: DesignTicketStatus[] = ["changes_requested", "closed", "cancelled"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = await request.json().catch(() => ({}));

  const { limited } = checkRateLimit(`design-token:${clientIp(await headers())}`);
  if (limited) {
    return NextResponse.json(
      { error: "Too many changes at once — give it a minute." },
      { status: 429 },
    );
  }

  const to = body.to as DesignTicketStatus;
  if (!REQUESTER_MOVES.includes(to)) {
    return NextResponse.json({ error: "You can't do that from here." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const ticket = await getTicketByToken(supabase, token);
  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const note = typeof body.body === "string" ? body.body : null;

  const result = await applyTransition(
    supabase,
    ticket.id,
    to,
    { type: "requester", name: ticket.requester_name, email: ticket.requester_email },
    note,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // Nobody is watching the queue at 11pm on a Saturday; the email is what turns
  // a change request into something a designer finds out about.
  if (to === "changes_requested" && note) {
    try {
      await sendChangesRequestedAlert(
        {
          id: ticket.id,
          ref: ticket.ref,
          title: ticket.title,
          requester_name: ticket.requester_name,
        },
        note,
        ticket.assignee_email,
      );
    } catch (err) {
      console.error("📧 Design change-request alert failed:", err);
    }
  }

  const updated = await getTicketByToken(supabase, token);
  return NextResponse.json(await requesterView(supabase, updated as TicketRow), {
    headers: { "Cache-Control": "no-store" },
  });
}
