import { NextResponse } from "next/server";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Human-friendly order number, e.g. "DT-7F3K9Q2X".
const orderId = customAlphabet("ACDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
  customer: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  }),
});

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
  const { items, customer } = parsed.data;

  // Merge duplicate lines so stock checks see the true requested quantity.
  const qtyByVariant = new Map<string, number>();
  for (const item of items) {
    qtyByVariant.set(
      item.variantId,
      (qtyByVariant.get(item.variantId) ?? 0) + item.quantity,
    );
  }

  const supabase = getSupabaseAdmin();

  // Load the variants (with their parent product) fresh from the DB — the
  // client's prices are never trusted.
  const { data: variants, error: variantErr } = await supabase
    .from("product_variants")
    .select("*, product:products(*)")
    .in("id", [...qtyByVariant.keys()]);

  if (variantErr) {
    return NextResponse.json({ error: "Could not load your basket" }, { status: 500 });
  }

  type VariantRow = {
    id: string;
    size: string;
    color: string;
    price_pennies: number | null;
    stock: number;
    is_active: boolean;
    product: {
      id: string;
      name: string;
      base_price_pennies: number;
      is_published: boolean;
    } | null;
  };

  const rows = (variants ?? []) as VariantRow[];

  const orderItems: {
    product_id: string | null;
    variant_id: string;
    product_name: string;
    size: string | null;
    color: string | null;
    unit_price_pennies: number;
    quantity: number;
  }[] = [];
  let subtotal = 0;

  for (const [variantId, quantity] of qtyByVariant) {
    const v = rows.find((r) => r.id === variantId);
    if (!v || !v.product || !v.product.is_published || !v.is_active) {
      return NextResponse.json(
        { error: "One of your items is no longer available." },
        { status: 409 },
      );
    }
    if (v.stock < quantity) {
      return NextResponse.json(
        {
          error: `Only ${v.stock} of "${v.product.name}" (${[v.color, v.size]
            .filter(Boolean)
            .join(" / ")}) left in stock.`,
        },
        { status: 409 },
      );
    }
    const unit = v.price_pennies ?? v.product.base_price_pennies;
    subtotal += unit * quantity;
    orderItems.push({
      product_id: v.product.id,
      variant_id: v.id,
      product_name: v.product.name,
      size: v.size || null,
      color: v.color || null,
      unit_price_pennies: unit,
      quantity,
    });
  }

  const total = subtotal; // collection-only: no shipping/handling
  if (total <= 0) {
    return NextResponse.json({ error: "Your basket is empty." }, { status: 400 });
  }

  const orderNumber = `DT-${orderId()}`;

  // Create the pending order + items. The webhook flips it to `paid`.
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || null,
      notes: customer.notes || null,
      status: "pending",
      fulfillment_method: "collection",
      subtotal_pennies: subtotal,
      total_pennies: total,
      currency: "gbp",
    })
    .select()
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: "Could not start your order" }, { status: 500 });
  }

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));
  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json({ error: "Could not start your order" }, { status: 500 });
  }

  // Create the PaymentIntent and link it to the order.
  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: total,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      receipt_email: customer.email,
      description: `Destiny Church Shop — ${orderNumber}`,
      metadata: { order_id: order.id, order_number: orderNumber },
    });

    await supabase
      .from("orders")
      .update({ stripe_payment_intent_id: intent.id })
      .eq("id", order.id);

    return NextResponse.json({
      clientSecret: intent.client_secret,
      orderNumber,
    });
  } catch (err) {
    // Roll back the pending order so we don't leave a dangling record.
    await supabase.from("orders").delete().eq("id", order.id);
    console.error("Stripe PaymentIntent error:", err);
    return NextResponse.json(
      { error: "Payment could not be started. Please try again." },
      { status: 502 },
    );
  }
}
