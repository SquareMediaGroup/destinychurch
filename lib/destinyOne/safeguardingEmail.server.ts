// Destiny One — email the safeguarding team when a message is reported.
//
// The admin bell only helps if someone is signed in to the website, so every
// Safeguarding Admin also gets an email. Deliberately content-free: no message
// text, no names, no group name (the email may be read on a shared or lock
// screen). The admin page has the detail, behind the safeguarding role.
//
// Best-effort: called from `after()`, so a slow or failing send never delays
// or fails the report itself.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { sendEmailCard } from "@/lib/emailCard";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://destinytees.uk";

export async function emailSafeguardingAboutReport(): Promise<void> {
  try {
    const { data, error } = await createServiceClient()
      .from("admin_roles")
      .select("email")
      .eq("safeguarding_admin", true);
    if (error) throw error;

    const recipients = [...new Set((data ?? []).map((r) => (r.email as string | null)?.trim()).filter((e): e is string => !!e))];
    if (recipients.length === 0) {
      console.warn("⚠️ Destiny One: a message was reported but no one has the Safeguarding Admin role to email.");
      return;
    }

    // One email each, so safeguarding admins don't see each other's addresses.
    for (const to of recipients) {
      await sendEmailCard({
        to,
        subject: "A message was reported in Destiny One",
        badge: "Safeguarding",
        heading: "A message was reported",
        intro:
          "Someone reported a message in Destiny One. Please review it in the safeguarding queue. " +
          "The details are only shown there, to people with the Safeguarding Admin role.",
        rows: [],
        ctaHref: `${SITE}/admin/destiny-one/safeguarding`,
        ctaLabel: "Open the safeguarding queue",
      });
    }
    console.log(`📨 Destiny One report alert sent to ${recipients.length} safeguarding admin(s)`);
  } catch (err) {
    console.error("⚠️ Destiny One report alert email failed:", err);
  }
}
