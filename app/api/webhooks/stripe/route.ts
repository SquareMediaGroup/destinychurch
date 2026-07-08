import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Resend } from "resend";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase";
import { formatPrice, type OrderItem } from "@/lib/shop";

// Stripe needs the raw request body to verify the signature, so this must run on
// the Node runtime. This route is intentionally OUTSIDE the middleware matcher:
// it's authenticated by the Stripe signature, not by Supabase.
export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Destiny Church Shop <noreply@support.squaremediagroup.org>";
const NOTIFY = process.env.SHOP_ORDER_NOTIFY_EMAIL || "techteam@destinytees.uk";

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
      await handleSucceeded(event.data.object as Stripe.PaymentIntent);
    } else if (event.type === "payment_intent.payment_failed") {
      await handleFailed(event.data.object as Stripe.PaymentIntent);
    }
  } catch (err) {
    console.error(`Stripe webhook handler error (${event.type}):`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleSucceeded(intent: Stripe.PaymentIntent) {
  const supabase = getSupabaseAdmin();

  const { data: order } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("stripe_payment_intent_id", intent.id)
    .maybeSingle();

  if (!order) {
    console.warn(`⚠️  No order found for PaymentIntent ${intent.id}`);
    return;
  }

  // Idempotency: Stripe can deliver the same event more than once.
  if (order.status === "paid" || order.status === "fulfilled") return;

  await supabase
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", order.id);

  // Decrement stock for each line (floored at zero).
  const items = (order.items ?? []) as OrderItem[];
  for (const item of items) {
    if (!item.variant_id) continue;
    const { data: variant } = await supabase
      .from("product_variants")
      .select("stock")
      .eq("id", item.variant_id)
      .maybeSingle();
    if (variant) {
      const next = Math.max(0, variant.stock - item.quantity);
      await supabase
        .from("product_variants")
        .update({ stock: next })
        .eq("id", item.variant_id);
    }
  }

  console.log(`✅ Order ${order.order_number} paid (${formatPrice(order.total_pennies)})`);

  // Confirmation emails (best-effort — never fail the webhook on email).
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
}

async function handleFailed(intent: Stripe.PaymentIntent) {
  const supabase = getSupabaseAdmin();
  const { data: order } = await supabase
    .from("orders")
    .select("id, status")
    .eq("stripe_payment_intent_id", intent.id)
    .maybeSingle();
  if (order && order.status === "pending") {
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
  }
}

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
  order: { order_number: string; customer_name: string; customer_email: string; customer_phone: string | null; notes: string | null },
  summary: string,
): string {
  const contact = `${esc(order.customer_name)} &bull; ${esc(order.customer_email)}${
    order.customer_phone ? ` &bull; ${esc(order.customer_phone)}` : ""
  }${order.notes ? `<br /><span style="color:#6b7280;">Note: ${esc(order.notes)}</span>` : ""}`;
  return shell(
    `New order ${order.order_number}`,
    "New shop order",
    contact,
    summary,
  );
}
