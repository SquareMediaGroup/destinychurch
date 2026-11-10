import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { checkFreeItemTicket, completeFreeOrder } from "@/lib/checkout.server";
import { clientIp, limitKey, sharedRateLimit } from "@/lib/rateLimit";

// POST /api/store/checkout/confirm  { ticket, code }
//
// The second half of a free-only order (see ../route.ts): the customer types
// the 6-digit code that was emailed to them, and the order completes. Public,
// so tries are capped per connection and, more tightly, per order: a ticket
// carries no count of wrong guesses, and five an hour against a million codes
// leaves guessing nowhere to go.

export const runtime = "nodejs";

const schema = z.object({
  ticket: z.string().min(20).max(2000),
  code: z.string().trim().regex(/^\d{6}$/),
});

const TOO_MANY = "Too many tries. Please wait a while, then start your order again.";

export async function POST(request: Request) {
  if (await sharedRateLimit(await limitKey("checkout-confirm", clientIp(await headers())), 30)) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code from the email." }, { status: 400 });
  }

  // Keyed on the ticket itself, before the code is looked at, so wrong and
  // right guesses count alike.
  if (await sharedRateLimit(await limitKey("checkout-confirm-ticket", parsed.data.ticket), 5, 60 * 60)) {
    return NextResponse.json({ error: TOO_MANY }, { status: 429 });
  }

  const check = checkFreeItemTicket(parsed.data.ticket, parsed.data.code);
  if (!check.ok) {
    return NextResponse.json(
      {
        error:
          check.reason === "expired"
            ? "That code has expired. Please start your order again."
            : "That code isn't right. Check the email and try again.",
      },
      { status: 400 },
    );
  }

  try {
    const done = await completeFreeOrder(check.orderDbId, check.email);
    if (!done.ok) return NextResponse.json({ error: done.error }, { status: done.status });
    return NextResponse.json({ orderNumber: done.orderNumber, free: true });
  } catch (err) {
    console.error("Free order could not be completed:", err);
    return NextResponse.json({ error: "Your order could not be placed. Please try again." }, { status: 500 });
  }
}
