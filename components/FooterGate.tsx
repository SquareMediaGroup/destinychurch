"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (
    pathname.startsWith("/admin") ||
    // /nfc is the in-service NFC landing page — deliberately chrome-free.
    pathname.startsWith("/nfc") ||
    // /portal is the staff self-service area — its own minimal shell.
    pathname.startsWith("/portal") ||
    // /login is the staff/admin sign-in page — deliberately chrome-free.
    pathname === "/login"
  )
    return null;
  return <>{children}</>;
}
