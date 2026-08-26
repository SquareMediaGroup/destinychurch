import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { ORDER_STATUS_LABELS, formatPrice, type OrderStatus } from "@/lib/shop";
import { readForAudit, recordAudit } from "@/lib/audit.server";

const ALLOWED_STATUS: OrderStatus[] = [
  "pending",
  "paid",
  "fulfilled",
  "cancelled",
  "refunded",
];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH — update fulfilment status (mark fulfilled / cancelled, etc.).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const status = body.status as OrderStatus | undefined;

  if (!status || !ALLOWED_STATUS.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const before = await readForAudit("orders", id);
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("*, items:order_items(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Money and fulfilment: the entry names the customer and the total so a
  // refund can be traced without opening the order.
  const reference = data.order_number ?? data.id;
  await recordAudit({
    action: status === "refunded" || status === "cancelled" ? "reject" : "update",
    section: "store",
    entity: "order",
    entityId: id,
    entityLabel: String(reference),
    summary: `Marked order ${reference} as ${ORDER_STATUS_LABELS[status] ?? status}${
      data.customer_email ? ` (${data.customer_email})` : ""
    }`,
    changes: {
      status: { from: before?.status ?? null, to: status },
    },
    metadata: {
      total: typeof data.total_pennies === "number" ? formatPrice(data.total_pennies) : null,
      customer_email: data.customer_email ?? null,
    },
  });

  return NextResponse.json(data);
}
