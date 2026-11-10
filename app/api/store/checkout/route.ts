import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { getStripe } from "@/lib/stripe";
import { clientIp, limitKey, sharedRateLimit } from "@/lib/rateLimit";
import {
  buildPendingOrder,
  checkoutSchema,
  deleteOrder,
  startFreeItemCheck,
} from "@/lib/checkout.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Rate-limit: checkout creates DB rows + a Stripe PaymentIntent. Counted
  // across every server instance; 30 a minute because a Sunday queue on the
  // church Wi-Fi shares one address.
  const limited = await sharedRateLimit(await limitKey("checkout", clientIp(await headers())), 30);
  if (limited) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout details" }, { status: 400 });
  }

  const built = await buildPendingOrder(parsed.data);
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: built.status });
  }

  // Nothing to pay (a basket holding only the one free item). The order stays
  // pending until the customer types in a code emailed to the address they
  // gave: the free item is one per address, and without this any made-up
  // address was good for another one (lib/checkout.server.ts).
  if (built.total === 0) {
    try {
      const ticket = await startFreeItemCheck(built.orderDbId, built.orderNumber, parsed.data.customer.email);
      return NextResponse.json({ verifyEmail: true, orderNumber: built.orderNumber, ticket });
    } catch (err) {
      console.error("Free item code not sent:", err);
      await deleteOrder(built.orderDbId);
      return NextResponse.json(
        { error: "We couldn't email your confirmation code. Please check the address and try again." },
        { status: 502 },
      );
    }
  }

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: built.total,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      receipt_email: parsed.data.customer.email,
      description: `Destiny Church Shop — ${built.orderNumber}`,
      metadata: { order_id: built.orderDbId, order_number: built.orderNumber },
    });

    await createServiceClient()
      .from("orders")
      .update({ stripe_payment_intent_id: intent.id })
      .eq("id", built.orderDbId);

    return NextResponse.json({
      clientSecret: intent.client_secret,
      orderNumber: built.orderNumber,
    });
  } catch (err) {
    // Roll back the pending order so we don't leave a dangling record.
    await deleteOrder(built.orderDbId);
    console.error("Stripe PaymentIntent error:", err);
    return NextResponse.json(
      { error: "Payment could not be started. Please try again." },
      { status: 502 },
    );
  }
}
