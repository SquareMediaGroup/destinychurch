// Weekly refresh of the VPN/Tor/datacenter/Private-Relay range lists behind
// engagement_events.ip_category (see supabase/migrations/20260828_ip_reputation.sql
// for the schema, the trigger, and why these four sources and not others).
//
// Weekly, not nightly: these ranges move slowly, and refetching a combined
// ~345,000 rows every night would be effort with no payoff. "0 5 * * 1"
// (Monday 05:00) in vercel.json, clear of every nightly job.
//
// Same CRON_SECRET fail-closed pattern as every other cron here. Each of the
// four sources is fetched and loaded independently — one source being
// temporarily unreachable (a GitHub outage, Apple changing a URL) must not
// stop the other three from refreshing.
//
// Loaded via the existing service-role Supabase client, chunked, rather than
// a raw Postgres connection: this codebase has no other dependency on a raw
// driver, and at a few dozen chunked upserts run once a week the extra round
// trips are irrelevant. Introducing one just to shave seconds off a weekly
// job would be solving a problem that doesn't exist here.
//
// Batch-swap, not truncate-then-reload: every row loaded in one run shares a
// single batch_id, and the very last step deletes whatever the previous run
// for that source left behind. New ranges are live as soon as they land, and
// the table is never briefly empty.

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export const dynamic = "force-dynamic";
// Loading ~345k rows in ~10k-row chunks is comfortably under a minute in
// practice, but the project already runs multiple daily crons (so it isn't on
// Hobby's 10s cap) — a generous ceiling costs nothing and a tight one risks a
// truncated Apple Private Relay load.
export const maxDuration = 300;

type Category = "tor" | "vpn" | "datacenter" | "apple_private_relay";

const SOURCES: { category: Category; source: string; url: string }[] = [
  {
    category: "tor",
    source: "torbulkexitlist",
    url: "https://check.torproject.org/torbulkexitlist",
  },
  {
    category: "vpn",
    source: "x4bnet_vpn",
    url: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt",
  },
  {
    category: "datacenter",
    source: "x4bnet_datacenter",
    url: "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/datacenter/ipv4.txt",
  },
  {
    category: "apple_private_relay",
    source: "icloud_relay",
    url: "https://mask-api.icloud.com/egress-ip-ranges.csv",
  },
];

const CHUNK_SIZE = 10_000;
const FETCH_TIMEOUT_MS = 60_000;

/**
 * Tor's list is bare IPs (one per line); everyone else's is already CIDR.
 * Apple's is a CSV with the CIDR as the first field — the rest (country,
 * region, city) isn't kept here, since geo for a Private Relay hit already
 * comes from Vercel's own x-vercel-ip-* headers at write time (the relay's
 * egress location, which is the same information either way).
 */
function parseCidrs(source: string, raw: string): string[] {
  const cidrs: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const field = source === "icloud_relay" ? trimmed.split(",")[0] : trimmed;
    const cidr = field.includes("/") ? field : `${field}/32`;
    cidrs.push(cidr);
  }
  return cidrs;
}

async function fetchList(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to refresh IP reputation ranges.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const batchId = randomUUID();
  const results: Record<string, { loaded: number; error?: string }> = {};

  for (const { category, source, url } of SOURCES) {
    try {
      const raw = await fetchList(url);
      const cidrs = parseCidrs(source, raw);

      for (const rows of chunk(cidrs, CHUNK_SIZE)) {
        const { error } = await supabase.from("ip_reputation_ranges").upsert(
          rows.map((cidr) => ({ cidr, category, source, batch_id: batchId })),
          { onConflict: "category,source,cidr" },
        );
        if (error) throw new Error(error.message);
      }

      // The swap: anything from this source not in the batch just loaded is
      // stale (a range that dropped off the upstream list) and is retired now.
      const { error: sweepError } = await supabase
        .from("ip_reputation_ranges")
        .delete()
        .eq("source", source)
        .neq("batch_id", batchId);
      if (sweepError) throw new Error(sweepError.message);

      results[source] = { loaded: cidrs.length };
    } catch (err) {
      // One source failing must not stop the others — see the file header.
      const message = err instanceof Error ? err.message : String(err);
      console.error(`⚠️ ip-reputation-refresh: ${source} failed:`, message);
      results[source] = { loaded: 0, error: message };
    }
  }

  console.log("🧭 ip-reputation-refresh:", results);
  return NextResponse.json({ ok: true, batchId, results });
}
