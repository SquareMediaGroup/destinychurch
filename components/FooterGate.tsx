"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function FooterGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/sermons") || pathname.startsWith("/admin") || pathname === "/100") return null;
  return <>{children}</>;
}
