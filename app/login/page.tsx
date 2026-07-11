import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LoginClient from "./LoginClient";

export const metadata = {
  title: "Staff Sign-In",
};

// Always evaluate the session per request — never cache the login state.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in — go straight to the dashboard.
  if (user) redirect("/admin");

  return <LoginClient />;
}
