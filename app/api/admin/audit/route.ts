// Reading the audit log — the list behind /admin/audit.
//
// Super Admin only, and not by accident: /api/admin/audit isn't in ROUTE_RULES,
// and anything under /api/admin that isn't listed there is Super Admin only
// (fail closed — see lib/adminRoles.ts). It is left unlisted deliberately
// rather than given a rule, because the log spans every section: a Store Admin
// with a rule here would be able to read HR's activity, and a rule narrow
// enough to prevent that would be a second, drifting copy of the RBAC table.
//
// Paginated with a keyset (`before=<id>`), not an offset. The log only ever
// grows and is always read newest-first, so an offset would re-scan everything
// it had already returned and could skip a row that landed mid-scroll.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { rangeStart, siteDayKey, type AuditEntry } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Rows per page. A screenful and change — the page has a "Load more". */
const PAGE_SIZE = 50;

/**
 * How many rows the facet counts look at. The chips are a navigation aid, not
 * a report: past this the counts are shown as "500+" rather than paying for an
 * exact aggregate the weekly report already does properly.
 */
const FACET_SCAN = 2000;

/** Escape the wildcards PostgREST's `ilike` treats as special. */
function likeTerm(query: string): string {
  return `%${query.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const actor = searchParams.get("actor");
  const section = searchParams.get("section");
  const action = searchParams.get("action");
  const entity = searchParams.get("entity");
  const entityId = searchParams.get("entity_id");
  const range = searchParams.get("range") ?? "month";
  const before = searchParams.get("before");
  const limit = Math.min(Number(searchParams.get("limit")) || PAGE_SIZE, 200);

  const supabase = createServiceClient();
  const since = rangeStart(range);

  // The filters, as data. Both the page query and the facet query below apply
  // exactly this set, so the chips can never end up counting a different slice
  // of the log than the rows underneath them.
  const equals: [string, string][] = [];
  if (actor && actor !== "all") equals.push(["actor_email", actor]);
  if (section && section !== "all") equals.push(["section", section]);
  if (action && action !== "all") equals.push(["action", action]);
  if (entity) equals.push(["entity", entity]);
  if (entityId) equals.push(["entity_id", entityId]);

  // Summary first because that is the sentence people search; the other two
  // catch "Faith Hoodie" and "sarah@" when the summary is phrased differently.
  const term = q ? likeTerm(q) : null;
  const orTerm = term
    ? `summary.ilike.${term},entity_label.ilike.${term},actor_email.ilike.${term}`
    : null;

  let query = supabase.from("audit_log").select("*").order("id", { ascending: false });
  if (since) query = query.gte("created_at", since);
  for (const [column, value] of equals) query = query.eq(column, value);
  if (orTerm) query = query.or(orTerm);
  if (before) query = query.lt("id", before);

  // One extra row tells us whether there is another page without a count query.
  const { data, error } = await query.limit(limit + 1);

  if (error) {
    // The most common cause is the migration not having run yet. Say so plainly
    // rather than leaving the page showing an empty log that looks correct.
    const missingTable = /relation .*audit_log.* does not exist/i.test(error.message);
    return NextResponse.json(
      {
        error: missingTable
          ? "The audit log table isn't there yet — run supabase/migrations/20260826_audit_log.sql."
          : error.message,
      },
      { status: missingTable ? 503 : 500 },
    );
  }

  const rows = (data ?? []) as AuditEntry[];
  const hasMore = rows.length > limit;
  const entries = hasMore ? rows.slice(0, limit) : rows;

  // Facets come back only with the first page — recomputing them on every
  // "Load more" would be wasted work.
  //
  // They apply the time range and the search but NOT the chip filters, the same
  // way lib/useAdminList.ts counts: a chip has to keep showing what picking it
  // would give you, and a count that collapses to "all of them" the moment you
  // click it tells you nothing.
  let facets = null;
  if (!before) {
    let facetQuery = supabase
      .from("audit_log")
      .select("actor_email, section, action, created_at")
      .order("id", { ascending: false });
    if (since) facetQuery = facetQuery.gte("created_at", since);
    if (orTerm) facetQuery = facetQuery.or(orTerm);
    const { data: facetRows } = await facetQuery.limit(FACET_SCAN);

    const count = (
      key: "actor_email" | "section" | "action",
    ): Record<string, number> => {
      const out: Record<string, number> = {};
      for (const row of facetRows ?? []) {
        const value = (row as Record<string, string | null>)[key];
        if (!value) continue;
        out[value] = (out[value] ?? 0) + 1;
      }
      return out;
    };

    // Bucketed by church-local day (see SITE_TIME_ZONE, lib/audit.ts) so the
    // sparkline's days line up with the day someone would actually call
    // "today" — the same reasoning that made siteDayBounds necessary for the
    // range filter itself. One more reduce over rows already in memory from
    // the counts above, not a second query.
    const byDay: Record<string, number> = {};
    for (const row of facetRows ?? []) {
      const day = siteDayKey(new Date((row as { created_at: string }).created_at));
      byDay[day] = (byDay[day] ?? 0) + 1;
    }

    facets = {
      actors: count("actor_email"),
      sections: count("section"),
      actions: count("action"),
      byDay,
      scanned: facetRows?.length ?? 0,
      capped: (facetRows?.length ?? 0) >= FACET_SCAN,
    };
  }

  return NextResponse.json(
    { entries, hasMore, nextBefore: hasMore ? entries[entries.length - 1]?.id : null, facets },
    { headers: { "Cache-Control": "no-store" } },
  );
}
