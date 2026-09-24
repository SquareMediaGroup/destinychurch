// Numbers for one links page: views, clicks, click-through, and which blocks,
// referrers and QR/NFC tags they came from.
//
// GET only — reads are deliberately not audited (see app/api/admin/analytics).
// Views are `links_view` rows keyed by page id (recorded server-side by
// components/links/LinkPageRoute.tsx); clicks are `links` rows keyed by block
// id. Bots are left out.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { rangeStart } from "@/lib/audit";
import { srcTagLabel } from "@/lib/engagement";
import { blockLabel } from "@/lib/linkPages/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const ROW_CAP = 20000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function top(map: Map<string, number>, n: number) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  // The id goes into a PostgREST filter string below, so it must be exactly a
  // uuid — anything else could rewrite the filter.
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Page not found" }, { status: 404 });
  const range = new URL(request.url).searchParams.get("range") ?? "month";
  const since = rangeStart(range);
  const supabase = createServiceClient();

  const { data: blocks } = await supabase
    .from("link_blocks")
    .select("id, type, data, sort_order")
    .eq("page_id", id)
    .order("sort_order", { ascending: true });
  const blockIds = (blocks ?? []).map((b) => b.id as string);

  let query = supabase
    .from("engagement_events")
    .select("source, target_key, created_at, referrer_host, src_tag, visitor_hash")
    .eq("is_bot", false)
    .or(
      blockIds.length
        ? `and(source.eq.links_view,target_key.eq.${id}),and(source.eq.links,target_key.in.(${blockIds.join(",")}))`
        : `and(source.eq.links_view,target_key.eq.${id})`,
    )
    .order("created_at", { ascending: false })
    .limit(ROW_CAP);
  if (since) query = query.gte("created_at", since);

  const { data: events, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = events ?? [];
  const daily = new Map<string, { views: number; clicks: number }>();
  const clicksByBlock = new Map<string, number>();
  const referrers = new Map<string, number>();
  const tags = new Map<string, number>();
  const visitors = new Set<string>();
  let views = 0;
  let clicks = 0;

  for (const row of rows) {
    const day = String(row.created_at).slice(0, 10);
    const bucket = daily.get(day) ?? { views: 0, clicks: 0 };
    if (row.source === "links_view") {
      views++;
      bucket.views++;
      if (row.visitor_hash) visitors.add(row.visitor_hash);
      referrers.set(row.referrer_host ?? "Direct", (referrers.get(row.referrer_host ?? "Direct") ?? 0) + 1);
      const tag = srcTagLabel(row.src_tag);
      tags.set(tag, (tags.get(tag) ?? 0) + 1);
    } else {
      clicks++;
      bucket.clicks++;
      clicksByBlock.set(row.target_key, (clicksByBlock.get(row.target_key) ?? 0) + 1);
    }
    daily.set(day, bucket);
  }

  return NextResponse.json(
    {
      range,
      capped: rows.length >= ROW_CAP,
      totals: {
        views,
        visitors: visitors.size,
        clicks,
        ctr: views > 0 ? clicks / views : null,
      },
      daily: [...daily.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, v]) => ({ day, ...v })),
      blocks: (blocks ?? []).map((b) => ({
        id: b.id,
        type: b.type,
        label: blockLabel(b as { type: string; data: Record<string, unknown> }),
        clicks: clicksByBlock.get(b.id as string) ?? 0,
      })),
      referrers: top(referrers, 8),
      sources: top(tags, 6),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
