// What visitors sent through a page's form blocks: list (or CSV), and delete.
//
// Personal data, so reads are not cached and deletes are audited. There is no
// edit — a submission is a record of what someone sent, not a working copy.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

interface StoredValue {
  label: string;
  value: string | boolean;
}

/** One CSV cell. Quotes doubled; leading =+-@ neutralised so a spreadsheet can't run it as a formula. */
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  const { data, error } = await createServiceClient()
    .from("link_form_submissions")
    .select("id, block_id, block_label, email, data, created_at")
    .eq("page_id", id)
    .order("created_at", { ascending: false })
    .limit(format === "csv" ? 10000 : 500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = data ?? [];

  if (format !== "csv") return NextResponse.json({ submissions: rows });

  // Columns: the union of every field label, in first-seen order.
  const labels: string[] = [];
  for (const row of rows) {
    for (const v of Object.values((row.data ?? {}) as Record<string, StoredValue>)) {
      if (v?.label && !labels.includes(v.label)) labels.push(v.label);
    }
  }

  const lines = [
    ["Received", "Form", ...labels].map(csvCell).join(","),
    ...rows.map((row) => {
      const byLabel = new Map(
        Object.values((row.data ?? {}) as Record<string, StoredValue>).map((v) => [v.label, v.value]),
      );
      return [
        new Date(row.created_at).toISOString(),
        row.block_label ?? "",
        ...labels.map((l) => {
          const v = byLabel.get(l);
          return typeof v === "boolean" ? (v ? "Yes" : "No") : v ?? "";
        }),
      ]
        .map(csvCell)
        .join(",");
    }),
  ];

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="links-submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const submissionId = new URL(request.url).searchParams.get("submission");
  if (!submissionId) return NextResponse.json({ error: "Missing submission" }, { status: 400 });

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("link_form_submissions")
    .select("id, block_label, email, created_at")
    .eq("id", submissionId)
    .eq("page_id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const { error } = await supabase.from("link_form_submissions").delete().eq("id", submissionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The log names the form and when, never the person's details — an audit
  // entry must not become a second copy of the data that was just deleted.
  await recordAudit({
    action: "delete",
    section: "announcements",
    entity: "form submission",
    entityId: submissionId,
    entityLabel: existing.block_label ?? "Form",
    summary: `Deleted a “${existing.block_label ?? "form"}” submission from a links page`,
  });

  return NextResponse.json({ ok: true });
}
