import { useSession } from "@/lib/session";
import { AuthFrame } from "@/features/auth/SignIn";

export function NotAllowed({ message }: { message: string }) {
  const { signOut, refreshMe } = useSession();
  return (
    <AuthFrame>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Not available</h1>
        <p className="muted" style={{ fontSize: 14, lineHeight: "20px" }}>{message}</p>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={() => void refreshMe()}>Try again</button>
        <button className="btn dark" onClick={() => void signOut()}>Sign out</button>
      </div>
    </AuthFrame>
  );
}
