import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { REMEMBER_COOKIE_NAME, stripMaxAge } from "./sessionCookie";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const createClient = (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Missing cookie (e.g. sessions predating this feature) defaults to
  // remembered, so we don't unexpectedly downgrade existing sessions.
  const remember = request.cookies.get(REMEMBER_COOKIE_NAME)?.value !== "0";

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              remember || !value ? options : stripMaxAge(options),
            )
          );
        },
      },
    },
  );

  return { supabase, supabaseResponse };
};
