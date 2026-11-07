import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import {
  buildPendingOrder,
  checkoutSchema,
  claimFreeItem,
  deleteOrder,
  finalizeOrderPaid,
} from "@/lib/checkout.server";
import { FREE_ITEM_LIMIT_MESSAGE } from "@/lib/shop";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Rate-limit: checkout creates DB rows + a Stripe PaymentIntent.
  const { limited } = checkRateLimit(`checkout:${clientIp(await headers())}`);
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

  // Nothing to pay (a basket holding only the one free item): take the
  // customer's free-item claim and complete the order straight away.
  if (built.total === 0) {
    let claimed = false;
    try {
      claimed = await claimFreeItem(parsed.data.customer.email, built.orderDbId);
    } catch (err) {
      console.error("Free item claim error:", err);
      await deleteOrder(built.orderDbId);
      return NextResponse.json(
        { error: "Your order could not be placed. Please try again." },
        { status: 500 },
      );
    }
    if (!claimed) {
      await deleteOrder(built.orderDbId);
      return NextResponse.json(
        { error: `You've already had your free item. ${FREE_ITEM_LIMIT_MESSAGE}` },
        { status: 409 },
      );
    }
    await finalizeOrderPaid(built.orderDbId);
    return NextResponse.json({ orderNumber: built.orderNumber, free: true });
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
