import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";

// GET /api/admin/destiny-one/safeguarding/audit?before=<id>
//
// The Destiny One slice of the site audit log: every action recorded under the
// destiny_one and safeguarding sections, newest first. The D1 Admin desktop
// app's "Audit log" page reads this.
//
// Safeguarding Admin only. The full log (/api/admin/audit) stays Super Admin
// only because it spans every section; this one is limited to the two
// sections the safeguarding team already works in. Only the summary sentence
// and who/when are returned, not the field-level changes or request details.

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;

  const before = new URL(request.url).searchParams.get("before");
  let query = createServiceClient()
    .from("audit_log")
    .select("id, created_at, actor_email, section, action, entity, entity_label, summary")
    .in("section", ["destiny_one", "safeguarding"])
    .order("id", { ascending: false });
  if (before && /^\d+$/.test(before)) query = query.lt("id", before);

  const { data, error } = await query.limit(PAGE_SIZE + 1);
  if (error) return NextResponse.json({ error: "Couldn't load the audit log." }, { status: 500 });

  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const entries = rows.slice(0, PAGE_SIZE);
  return NextResponse.json({
    entries,
    nextBefore: hasMore ? entries[entries.length - 1].id : null,
  });
}
