"use client";

import { useCallback, useState } from "react";
import { PageHeader, ErrorNote, Toggle, cardClass, inputClass, labelClass, primaryBtn } from "@/components/admin/AdminUI";
import { fetchAdminJson, useAdminLoader } from "@/lib/useAdminLoader";
import { adminSend } from "@/lib/destinyOne/adminClient";
import { ADMIN_API, type AdminSettings } from "@/lib/destinyOne/adminTypes";

export default function DestinyOneSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [expiry, setExpiry] = useState("30");
  const [minIos, setMinIos] = useState("1");
  const [minAndroid, setMinAndroid] = useState("1");
  const [updateMessage, setUpdateMessage] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    const s = await fetchAdminJson<AdminSettings>(`${ADMIN_API}/settings`);
    setSettings(s);
    setExpiry(String(s.inviteExpiryDays));
    setMinIos(String(s.minBuildIos));
    setMinAndroid(String(s.minBuildAndroid));
    setUpdateMessage(s.forceUpdateMessage ?? "");
    setMaintenance(s.maintenanceMessage ?? "");
  }, []);
  const { error, setError } = useAdminLoader(load);

  type Editable = "allowAccessRequests" | "inviteExpiryDays" | "minBuildIos" | "minBuildAndroid" | "forceUpdateMessage" | "maintenanceMessage";

  async function save(body: Partial<Pick<AdminSettings, Editable>>) {
    setSaved("");
    const res = await adminSend<AdminSettings>("PATCH", "/settings", body);
    if (!res.ok) return setError(res.error);
    setSettings(res.data);
    setSaved("Saved.");
  }

  function saveVersions() {
    if (!settings) return;
    const ios = Number(minIos);
    const android = Number(minAndroid);
    const raised = ios > settings.minBuildIos || android > settings.minBuildAndroid;
    if (raised && !window.confirm("Everyone on an older build will be locked out until they update from the App Store or Google Play. Continue?")) return;
    void save({ minBuildIos: ios, minBuildAndroid: android, forceUpdateMessage: updateMessage });
  }

  function saveMaintenance(message: string) {
    if (message && !window.confirm("This takes the Destiny One app offline for everyone until you clear it. Continue?")) return;
    void save({ maintenanceMessage: message });
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <PageHeader title="App settings" subtitle="How people get into Destiny One, and which app versions can use it." back={{ href: "/admin/destiny-one", label: "Destiny One" }} />
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

          <section className={`${cardClass} p-6`}>
            <h2 className="font-bold">App versions</h2>
            <p className="mt-1 mb-4 text-sm text-destiny-grey/60 dark:text-white/60">
              Anyone on a build below these numbers sees an &quot;update the app&quot; screen instead of their chats. Only raise them to retire a
              broken build, or after a change older builds can&apos;t handle. The build number is shown in App Store Connect and Google Play Console.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="s-min-ios">Lowest iOS build allowed</label>
                <input id="s-min-ios" type="number" min={1} className={inputClass} value={minIos} onChange={(e) => setMinIos(e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="s-min-android">Lowest Android build allowed</label>
                <input id="s-min-android" type="number" min={1} className={inputClass} value={minAndroid} onChange={(e) => setMinAndroid(e.target.value)} />
              </div>
            </div>
            <label className={`${labelClass} mt-4`} htmlFor="s-update-message">Message on the update screen (optional)</label>
            <textarea
              id="s-update-message"
              rows={2}
              maxLength={500}
              className={inputClass}
              placeholder="This version of Destiny One is out of date. Update it to keep chatting."
              value={updateMessage}
              onChange={(e) => setUpdateMessage(e.target.value)}
            />
            <button className={`${primaryBtn} mt-3`} onClick={saveVersions}>Save</button>
          </section>

          <section className={`${cardClass} p-6`}>
            <h2 className="font-bold">Maintenance</h2>
            <p className="mt-1 mb-4 text-sm text-destiny-grey/60 dark:text-white/60">
              {settings.maintenanceMessage
                ? "The app is offline. Everyone sees the message below instead of their chats."
                : "Emergency off switch. When a message is set, everyone sees it instead of their chats until you clear it."}
            </p>
            <label className={labelClass} htmlFor="s-maintenance">Maintenance message</label>
            <textarea
              id="s-maintenance"
              rows={2}
              maxLength={500}
              className={inputClass}
              placeholder="Destiny One is down for maintenance. We'll be back shortly."
              value={maintenance}
              onChange={(e) => setMaintenance(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button className={primaryBtn} disabled={!maintenance.trim()} onClick={() => saveMaintenance(maintenance.trim())}>
                {settings.maintenanceMessage ? "Update message" : "Take the app offline"}
              </button>
              {settings.maintenanceMessage && (
                <button className={primaryBtn} onClick={() => { setMaintenance(""); saveMaintenance(""); }}>
                  Bring the app back online
                </button>
              )}
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
