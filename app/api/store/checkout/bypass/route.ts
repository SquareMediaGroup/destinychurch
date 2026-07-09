import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import {
  buildPendingOrder,
  checkoutSchema,
  finalizeOrderPaid,
} from "@/lib/checkout.server";

export const runtime = "nodejs";

// Only team addresses can trigger the bypass — even if SHOP_TEST_BYPASS were
// ever left on somewhere, a random customer email still can't skip payment.
const ALLOWED_DOMAINS = ["squaremediagroup.org", "destinytees.uk"];

function isAllowedTestEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

// TEST-ONLY: complete an order without going through Stripe. Creates a real
// order, marks it paid, decrements stock and sends the confirmation emails —
// so the whole flow (success screen, admin orders, emails) can be exercised
// without a real payment. Guarded by the server-only SHOP_TEST_BYPASS flag so
// it is impossible to trigger in production (where the flag is unset), and
// further restricted to @squaremediagroup.org / @destinytees.uk emails.
export async function POST(request: Request) {
  if (process.env.SHOP_TEST_BYPASS !== "1") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { limited } = checkRateLimit(`bypass:${clientIp(await headers())}`);
  if (limited) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout details" }, { status: 400 });
  }

  if (!isAllowedTestEmail(parsed.data.customer.email)) {
    return NextResponse.json(
      { error: "Test checkout is only available for team email addresses." },
      { status: 403 },
    );
  }

  const built = await buildPendingOrder(parsed.data);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  await finalizeOrderPaid(built.orderDbId);
  console.log(`🧪 TEST bypass completed order ${built.orderNumber}`);

  return NextResponse.json({ orderNumber: built.orderNumber, bypass: true });
}
