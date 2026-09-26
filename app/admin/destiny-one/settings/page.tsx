"use client";

import { useCallback, useState } from "react";
import { PageHeader, ErrorNote, Toggle, cardClass, inputClass, labelClass, primaryBtn } from "@/components/admin/AdminUI";
import { fetchAdminJson, useAdminLoader } from "@/lib/useAdminLoader";
import { adminSend } from "@/lib/destinyOne/adminClient";
import { ADMIN_API, type AdminSettings } from "@/lib/destinyOne/adminTypes";

export default function DestinyOneSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [expiry, setExpiry] = useState("30");
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const s = await fetchAdminJson<AdminSettings>(`${ADMIN_API}/settings`);
    setSettings(s);
    setExpiry(String(s.inviteExpiryDays));
  }, []);
  const { error, setError } = useAdminLoader(load);

  async function save(body: Partial<Pick<AdminSettings, "allowAccessRequests" | "inviteExpiryDays">>) {
    setSaved("");
    const res = await adminSend<AdminSettings>("PATCH", "/settings", body);
    if (!res.ok) return setError(res.error);
    setSettings(res.data);
    setSaved("Saved.");
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <PageHeader title="App settings" subtitle="How people get into Destiny One." back={{ href: "/admin/destiny-one", label: "Destiny One" }} />
      <ErrorNote>{error}</ErrorNote>
      {saved && <p className="mb-4 rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{saved}</p>}

      {settings && (
        <div className="space-y-4">
          <section className={`${cardClass} p-6`}>
            <Toggle
              checked={settings.allowAccessRequests}
              onChange={(next) => save({ allowAccessRequests: next })}
              label="Let people ask to join"
            />
            <p className="mt-2 text-sm text-destiny-grey/60 dark:text-white/60">
              On: anyone who signs in without an invite can send a request for you to approve. Off: Destiny One is invite-only, and
              people without an invite are told to ask for one.
            </p>
          </section>

          <section className={`${cardClass} p-6`}>
            <label className={labelClass} htmlFor="s-expiry">Invites expire after (days)</label>
            <div className="flex gap-2">
              <input id="s-expiry" type="number" min={1} max={365} className={inputClass} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
              <button className={primaryBtn} onClick={() => save({ inviteExpiryDays: Number(expiry) })}>Save</button>
            </div>
          </section>

          <section className={`${cardClass} p-6 text-sm`}>
            <p className="font-bold">Message retention: {settings.retentionDays} days</p>
            <p className="mt-1 text-destiny-grey/60 dark:text-white/60">
              Messages older than this are deleted automatically, including deleted ones held for safeguarding. This is set by the
              safeguarding policy (environment setting D1_MESSAGE_RETENTION_DAYS), not here.
            </p>
            <p className="mt-4 font-bold">ChurchSuite: {settings.churchSuiteConfigured ? "connected (optional)" : "not connected"}</p>
            <p className="mt-1 text-destiny-grey/60 dark:text-white/60">
              Not needed to run Destiny One. When connected, staff can use Sign in with ChurchSuite and you can look people up while approving
              them.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
