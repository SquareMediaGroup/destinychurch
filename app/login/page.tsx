import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { resolvePostLoginPath } from "@/lib/staffPortalAuth";
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

  if (user) {
    // Already signed in — go straight to wherever this account belongs.
    const destination = await resolvePostLoginPath(createServiceClient(), user.id);
    if (destination) redirect(destination);
    // Authenticated, but neither an admin role nor a staff link — a genuine
    // orphan account (or one an admin hasn't finished setting up yet).
    // Don't redirect (would loop); show an explanatory state instead of
    // silently rendering the sign-in form to someone who is already signed in.
    return <LoginClient unassigned />;
  }

  return <LoginClient />;
}
