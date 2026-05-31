import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import AdminLoginClient from "./AdminLoginClient";

export const metadata = {
  title: "Staff Sign-In",
};

// Always evaluate the session per request — never cache the login state.
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in — skip the form and show the system chooser directly.
  if (user) {
    return (
      <AdminLoginClient initialPhase="choose" initialEmail={user.email ?? undefined} />
    );
  }

  return <AdminLoginClient initialPhase="login" />;
}
