// Destiny One — email the admins when a nightly job fails.
//
// The purge (retention) and the sync (rule re-check) run unattended from
// vercel.json. If either fails, nothing on screen shows it, so every Destiny
// One Admin and Super Admin gets an email with the job name and the error.
// No member data goes in it.
//
// Best-effort: an alert that can't be sent is logged, never thrown.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { sendEmailCard } from "@/lib/emailCard";

export async function alertJobFailed(job: string, detail: string): Promise<void> {
  try {
    const { data, error } = await createServiceClient()
      .from("admin_roles")
      .select("email")
      .or("destiny_one_admin.eq.true,super_admin.eq.true");
    if (error) throw error;

    const recipients = [...new Set((data ?? []).map((r) => (r.email as string | null)?.trim()).filter((e): e is string => !!e))];
    if (recipients.length === 0) {
      console.warn(`⚠️ Destiny One ${job} failed and there is no admin to email.`);
      return;
    }
    await sendEmailCard({
      to: recipients,
      subject: `Destiny One: the ${job} job failed`,
      badge: "Destiny One",
      heading: `The ${job} job failed`,
      intro: "A scheduled Destiny One job didn't finish. It runs again tomorrow night; if this keeps happening, check the Vercel logs.",
      rows: [
        ["Job", job],
        ["Error", detail.slice(0, 500)],
        ["When", new Date().toISOString()],
      ],
    });
    console.log(`📨 Destiny One ${job} failure alert sent to ${recipients.length} admin(s)`);
  } catch (err) {
    console.error(`⚠️ Destiny One ${job} failure alert could not be sent:`, err);
  }
}
