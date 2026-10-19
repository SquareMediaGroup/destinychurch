// Status page: email the Site Admins when an outage has been open for an hour.
//
// Runs every 10 minutes (vercel.json). Finds outages posted from /admin/status
// that started over an hour ago, are still open and haven't been alerted yet,
// emails everyone with site_admin through the site's Resend sender, and stamps
// long_outage_alerted_at so each outage alerts once. Amber alerts and
// maintenance don't trigger it.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { sendEmailCard } from "@/lib/emailCard";
import { STATUS_COMPONENTS } from "@/lib/statusComponents";

export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60_000;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://destinytees.uk";

function componentNames(ids: string[]): string {
  return ids.map((id) => STATUS_COMPONENTS.find((c) => c.id === id)?.name ?? id).join(", ");
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("⚠️ CRON_SECRET is not set — refusing to run the status outage alerts.");
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - HOUR_MS).toISOString();
  const { data: outages, error } = await supabase
    .from("status_incidents")
    .select("id, title, components, started_at")
    .eq("kind", "outage")
    .is("resolved_at", null)
    .is("long_outage_alerted_at", null)
    .lte("started_at", cutoff);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!outages || outages.length === 0) return NextResponse.json({ alerted: 0 });

  const { data: admins, error: adminError } = await supabase
    .from("admin_roles")
    .select("email")
    .eq("site_admin", true);
  if (adminError) return NextResponse.json({ error: adminError.message }, { status: 500 });
  const to = [...new Set((admins ?? []).map((r) => (r.email as string | null)?.trim()).filter((e): e is string => !!e))];
  if (to.length === 0) {
    console.warn("⚠️ A status outage has passed an hour but nobody has the Site Admin role to email.");
    return NextResponse.json({ alerted: 0, reason: "no site admins" });
  }

  let alerted = 0;
  for (const outage of outages) {
    const minutes = Math.round((Date.now() - new Date(outage.started_at).getTime()) / 60_000);
    await sendEmailCard({
      to,
      subject: `Outage still open after ${Math.floor(minutes / 60)}h: ${outage.title}`,
      badge: "Status page",
      heading: "An outage has been open for over an hour",
      intro: `“${outage.title}” is still marked as an outage on the status page. Post an update so members know how the fix is going, or resolve it if it's over.`,
      rows: [
        ["Affected", componentNames(outage.components ?? [])],
        ["Started", new Date(outage.started_at).toLocaleString("en-GB", { timeZone: "Europe/London" })],
        ["Open for", `${Math.floor(minutes / 60)}h ${minutes % 60}m`],
      ],
      ctaHref: `${SITE}/admin/status`,
      ctaLabel: "Open the status admin",
    });
    await supabase
      .from("status_incidents")
      .update({ long_outage_alerted_at: new Date().toISOString() })
      .eq("id", outage.id);
    alerted++;
  }

  console.log(`📨 Status outage alerts sent for ${alerted} outage(s) to ${to.length} site admin(s)`);
  return NextResponse.json({ alerted });
}
