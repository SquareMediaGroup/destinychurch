// Shared server-side checkout logic used by the real Stripe checkout, the
// Stripe webhook, and the test-bypass route — so pricing, stock and order
// finalisation can never drift between them.
import "server-only";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { Resend } from "resend";
import { createServiceClient } from "@/utils/supabase/service";
import { formatPrice, type OrderItem, type OrderWithItems } from "@/lib/shop";

const orderId = customAlphabet("ACDEFGHJKLMNPQRSTUVWXYZ23456789", 8);
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Destiny Church Shop <noreply@support.squaremediagroup.org>";
const NOTIFY = process.env.SHOP_ORDER_NOTIFY_EMAIL || "techteam@destinytees.uk";

export const checkoutSchema = z.object({
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

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export type BuildResult =
  | { ok: true; orderDbId: string; orderNumber: string; total: number }
  | { ok: false; status: number; error: string };

/**
 * Validate a cart against the DB, recompute every price server-side (client
 * prices are never trusted), check stock, and create a pending order + items.
 */
export async function buildPendingOrder(input: CheckoutInput): Promise<BuildResult> {
  const { items, customer } = input;

  // Merge duplicate lines so stock checks see the true requested quantity.
  const qtyByVariant = new Map<string, number>();
  for (const item of items) {
    qtyByVariant.set(
      item.variantId,
      (qtyByVariant.get(item.variantId) ?? 0) + item.quantity,
    );
  }

  const supabase = createServiceClient();

  const { data: variants, error: variantErr } = await supabase
    .from("product_variants")
    .select("*, product:products(*)")
    .in("id", [...qtyByVariant.keys()]);

  if (variantErr) {
    return { ok: false, status: 500, error: "Could not load your basket" };
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
      return { ok: false, status: 409, error: "One of your items is no longer available." };
    }
    if (v.stock < quantity) {
      return {
        ok: false,
        status: 409,
        error: `Only ${v.stock} of "${v.product.name}" (${[v.color, v.size]
          .filter(Boolean)
          .join(" / ")}) left in stock.`,
      };
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
    return { ok: false, status: 400, error: "Your basket is empty." };
  }

  const orderNumber = `DT-${orderId()}`;

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
    return { ok: false, status: 500, error: "Could not start your order" };
  }

  const { error: itemsErr } = await supabase
    .from("order_items")
    .insert(orderItems.map((oi) => ({ ...oi, order_id: order.id })));
  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", order.id);
    return { ok: false, status: 500, error: "Could not start your order" };
  }

  return { ok: true, orderDbId: order.id, orderNumber, total };
}

/** Delete a pending order (used to roll back if Stripe setup fails). */
export async function deleteOrder(orderDbId: string): Promise<void> {
  await createServiceClient().from("orders").delete().eq("id", orderDbId);
}

/**
 * Mark an order paid: flip status, decrement variant stock, and send the
 * confirmation emails. Idempotent — safe to call more than once (Stripe can
 * redeliver webhook events). Returns false if the order was already finalised.
 */
export async function finalizeOrderPaid(orderDbId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("id", orderDbId)
    .maybeSingle();

  if (!order) return false;
  if (order.status === "paid" || order.status === "fulfilled") return false;

  await supabase
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", order.id);

  const items = ((order as OrderWithItems).items ?? []) as OrderItem[];
  for (const item of items) {
    if (!item.variant_id) continue;
    // Atomic decrement (see decrement_variant_stock migration) — a
    // read-then-write here would let two concurrent finalizations both read
    // the same starting stock and clobber each other's decrement.
    const { error } = await supabase.rpc("decrement_variant_stock", {
      p_variant_id: item.variant_id,
      p_quantity: item.quantity,
    });
    if (error) {
      console.error(`Stock decrement failed for variant ${item.variant_id}:`, error);
    }
  }

  console.log(
    `✅ Order ${order.order_number} paid (${formatPrice(order.total_pennies)})`,
  );

  try {
    const summary = buildOrderSummaryHtml(items, order.total_pennies);
    await resend.emails.send({
      from: FROM,
      to: order.customer_email,
      subject: `Order confirmed — ${order.order_number}`,
      html: buildCustomerEmail(order.customer_name, order.order_number, summary),
    });
    await resend.emails.send({
      from: FROM,
      to: NOTIFY,
      subject: `New shop order: ${order.order_number} (${order.customer_name})`,
      html: buildChurchEmail(order, summary),
    });
  } catch (err) {
    console.error("Order confirmation email failed:", err);
  }

  return true;
}

/** Mark a pending order cancelled (payment failed). */
export async function cancelPendingByPaymentIntent(intentId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("stripe_payment_intent_id", intentId)
    .maybeSingle();
  if (order && order.status === "pending") {
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
  }
}

/** Look up an order's DB id from its Stripe PaymentIntent id. */
export async function orderIdByPaymentIntent(intentId: string): Promise<string | null> {
  const { data } = await createServiceClient()
    .from("orders")
    .select("id")
    .eq("stripe_payment_intent_id", intentId)
    .maybeSingle();
  return data?.id ?? null;
}

// ── Email templates ────────────────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildOrderSummaryHtml(items: OrderItem[], total: number): string {
  const rows = items
    .map((i) => {
      const variant = [i.color, i.size].filter(Boolean).join(" / ");
      return `<tr>
        <td style="padding:8px 0;font-size:14px;color:#111827;">
          ${esc(i.product_name)}${variant ? ` <span style="color:#6b7280;">(${esc(variant)})</span>` : ""}
          <span style="color:#6b7280;"> × ${i.quantity}</span>
        </td>
        <td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;">
          ${formatPrice(i.unit_price_pennies * i.quantity)}
        </td>
      </tr>`;
    })
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${rows}
      <tr><td colspan="2" style="border-top:1px solid rgba(0,0,0,0.08);padding-top:12px;"></td></tr>
      <tr>
        <td style="font-size:15px;font-weight:700;color:#111827;">Total</td>
        <td style="font-size:15px;font-weight:700;color:#111827;text-align:right;">${formatPrice(total)}</td>
      </tr>
    </table>`;
}

function shell(title: string, eyebrow: string, intro: string, summary: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>${esc(title)}</title></head>
  <body style="margin:0;padding:0;background:#f5f7fa;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;">
      <tr><td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="max-width:560px;background:#ffffff;border-radius:24px;border:1px solid rgba(0,0,0,0.07);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
          <tr><td style="height:4px;background:#F58021;"></td></tr>
          <tr><td style="padding:32px 28px 8px 28px;text-align:center;">
            <span style="display:inline-block;padding:5px 16px;border-radius:999px;background:rgba(245,128,33,0.1);color:#F58021;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">${esc(eyebrow)}</span>
            <h1 style="margin:18px 0 10px 0;font-size:24px;font-weight:800;color:#1a1a1a;">${esc(title)}</h1>
            <p style="margin:0 0 24px 0;font-size:14px;line-height:1.7;color:#6b7280;">${intro}</p>
          </td></tr>
          <tr><td style="padding:0 24px 24px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:16px;border:1px solid rgba(0,0,0,0.06);">
              <tr><td style="padding:20px 22px;">${summary}</td></tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
          Destiny Church Tees Valley &bull; <a href="https://destinytees.uk/shop" style="color:#9ca3af;">destinytees.uk/shop</a>
        </p>
      </td></tr>
    </table>
  </body></html>`;
}

function buildCustomerEmail(name: string, orderNumber: string, summary: string): string {
  return shell(
    `Order ${orderNumber}`,
    "Order confirmed",
    `Thanks ${esc(name)} — we've received your order. It'll be ready to <strong>collect at church</strong>. We'll be in touch when it's ready.`,
    summary,
  );
}

function buildChurchEmail(
  order: {
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    notes: string | null;
  },
  summary: string,
): string {
  const contact = `${esc(order.customer_name)} &bull; ${esc(order.customer_email)}${
    order.customer_phone ? ` &bull; ${esc(order.customer_phone)}` : ""
  }${order.notes ? `<br /><span style="color:#6b7280;">Note: ${esc(order.notes)}</span>` : ""}`;
  return shell(`New order ${order.order_number}`, "New shop order", contact, summary);
}
