"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function HeaderAuthButton({ className = "" }: { className?: string }) {
  const [signedIn, setSignedIn] = useState(false);
  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient();
    } catch (err) {
      console.error("Supabase client unavailable", err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;

    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (!signedIn) return null;

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`rounded-full border border-destiny-orange px-4 py-2 text-sm font-semibold text-destiny-orange transition hover:bg-destiny-orange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange ${className}`}
    >
      Log out
    </button>
  );
}
