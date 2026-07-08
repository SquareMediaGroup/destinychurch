import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  cancelPendingByPaymentIntent,
  finalizeOrderPaid,
  orderIdByPaymentIntent,
} from "@/lib/checkout.server";

// Stripe needs the raw request body to verify the signature, so this must run on
// the Node runtime. This route is intentionally OUTSIDE the middleware matcher:
// it's authenticated by the Stripe signature, not by Supabase.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Stripe webhook: missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig ?? "", secret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const orderDbId =
        (intent.metadata?.order_id as string | undefined) ??
        (await orderIdByPaymentIntent(intent.id));
      if (orderDbId) {
        await finalizeOrderPaid(orderDbId);
      } else {
        console.warn(`⚠️  No order found for PaymentIntent ${intent.id}`);
      }
    } else if (event.type === "payment_intent.payment_failed") {
      await cancelPendingByPaymentIntent((event.data.object as Stripe.PaymentIntent).id);
    }
  } catch (err) {
    console.error(`Stripe webhook handler error (${event.type}):`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
