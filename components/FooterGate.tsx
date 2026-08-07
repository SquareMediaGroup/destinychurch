"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (
    pathname.startsWith("/admin") ||
    // /nfc is the in-service NFC landing page — deliberately chrome-free.
    pathname.startsWith("/nfc")
  )
    return null;
  return <>{children}</>;
}
