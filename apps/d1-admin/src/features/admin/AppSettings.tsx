// The Destiny One app's settings (d1_settings), as on the website.

import { useEffect, useState } from "react";
import { Loading, PageHeader, Switch } from "@/components/ui";
import { admin, errorText } from "@/lib/api";
import { adminKeys, useSettings } from "@/lib/adminData";
import { queryClient } from "@/lib/queryClient";

export function AppSettings() {
  const settings = useSettings();
  const s = settings.data;
  const [expiry, setExpiry] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!s) return;
    setExpiry(String(s.inviteExpiryDays));
    setMaintenance(s.maintenanceMessage ?? "");
  }, [s]);

  const save = async (patch: Parameters<typeof admin.updateSettings>[0], what: string) => {
    setError(null);
    setSaved(null);
    try {
      const next = await admin.updateSettings(patch);
      queryClient.setQueryData(adminKeys.settings, next);
      setSaved(what);
    } catch (err) {
      setError(errorText(err));
    }
  };

  if (!s) return <><PageHeader title="App settings" />{settings.error ? <p className="error" style={{ padding: 24 }}>{errorText(settings.error)}</p> : <Loading />}</>;

  return (
    <>
      <PageHeader title="App settings" sub="For everyone using Destiny One" />
      <div className="scroll" style={{ flex: 1, minHeight: 0 }}>
        <div className="page-body" style={{ gap: 16 }}>
          <div className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 600 }}>Access requests</span>
              <span className="subtle" style={{ fontSize: 12 }}>When off, Destiny One is invite only: people without an invite can't ask to join.</span>
            </div>
            <Switch on={s.allowAccessRequests} label="Access requests" onChange={(v) => void save({ allowAccessRequests: v }, v ? "Access requests are open." : "Destiny One is invite only.")} />
          </div>
          <div className="card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 600 }}>Invites expire after</span>
              <span className="subtle" style={{ fontSize: 12 }}>Days. Applies to invites sent from now on.</span>
            </div>
            <input className="input" type="number" min={1} max={365} value={expiry} onChange={(e) => setExpiry(e.target.value)} style={{ width: 80 }} />
            <button className="btn" disabled={String(s.inviteExpiryDays) === expiry || !(Number(expiry) >= 1 && Number(expiry) <= 365)} onClick={() => void save({ inviteExpiryDays: Number(expiry) }, "Invite expiry saved.")}>Save</button>
          </div>
          <div className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 600 }}>Maintenance message</span>
              <span className="subtle" style={{ fontSize: 12 }}>When set, the phone app shows this instead of working. Leave blank for normal use.</span>
            </div>
            <textarea className="input" rows={2} maxLength={500} value={maintenance} onChange={(e) => setMaintenance(e.target.value)} />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" disabled={(s.maintenanceMessage ?? "") === maintenance} onClick={() => void save({ maintenanceMessage: maintenance.trim() || null }, maintenance.trim() ? "The phone app is now in maintenance." : "Maintenance message cleared.")}>Save</button>
            </div>
          </div>
          <p className="subtle" style={{ fontSize: 12 }}>Messages are kept for {s.retentionDays} days. ChurchSuite is {s.churchSuiteConfigured ? "connected" : "not connected"}. Minimum app builds are set on the website.</p>
          {saved && <p style={{ color: "var(--ok)", fontWeight: 600 }}>{saved}</p>}
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      </div>
    </>
  );
}
