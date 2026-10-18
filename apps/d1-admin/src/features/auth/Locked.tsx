// Opened with a saved session: Touch ID (or the Mac's password) first.

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { useSession } from "@/lib/session";
import { AuthFrame } from "@/features/auth/SignIn";

export function Locked() {
  const { unlock, signOut } = useSession();
  const [busy, setBusy] = useState(false);

  const tryUnlock = async () => {
    setBusy(true);
    try {
      await unlock();
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void tryUnlock();
    // Ask once on open; after that it's the button.

  }, []);

  return (
    <AuthFrame>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>D1 Admin is locked</h1>
        <p className="muted" style={{ fontSize: 14, lineHeight: "20px" }}>Use Touch ID or your Mac's password to open it.</p>
      </div>
      <button className="btn dark lg" onClick={() => void tryUnlock()} disabled={busy}>
        <Icon name="lock" size={16} /> Unlock
      </button>
      <button className="btn ghost" onClick={() => void signOut()}>Sign out</button>
    </AuthFrame>
  );
}
