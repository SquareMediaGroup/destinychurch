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

async function safeguardingRecipients(): Promise<string[]> {
  const { data, error } = await createServiceClient()
    .from("admin_roles")
    .select("email")
    .eq("safeguarding_admin", true);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => (r.email as string | null)?.trim()).filter((e): e is string => !!e))];
}

/**
 * A report was escalated to the Designated Safeguarding Lead. Goes to every
 * Safeguarding Admin (the DSL among them), with the same no-content rule as
 * the report alert: only the report number, so the right one can be found.
 */
export async function emailSafeguardingAboutEscalation(reportId: number): Promise<void> {
  try {
    const recipients = await safeguardingRecipients();
    if (recipients.length === 0) {
      console.warn("⚠️ Destiny One: a report was escalated but no one has the Safeguarding Admin role to email.");
      return;
    }
    for (const to of recipients) {
      await sendEmailCard({
        to,
        subject: `Destiny One report #${reportId} was escalated`,
        badge: "Safeguarding",
        heading: "A report needs the Designated Safeguarding Lead",
        intro:
          `Report #${reportId} in Destiny One was escalated to the Designated Safeguarding Lead. ` +
          "Please review it today. The details are only shown in the safeguarding queue, to people with the Safeguarding Admin role.",
        rows: [],
        ctaHref: `${SITE}/admin/destiny-one/safeguarding`,
        ctaLabel: "Open the safeguarding queue",
      });
    }
    console.log(`📨 Destiny One escalation alert for report #${reportId} sent to ${recipients.length} safeguarding admin(s)`);
  } catch (err) {
    console.error("⚠️ Destiny One escalation email failed:", err);
  }
}

export async function emailSafeguardingAboutReport(): Promise<void> {
  try {
    const recipients = await safeguardingRecipients();
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
