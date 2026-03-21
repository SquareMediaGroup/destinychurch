"use client";

import { usePathname } from "next/navigation";
import ChurchFooter from "./ChurchFooter";

export default function FooterGate() {
  const pathname = usePathname();
  if (pathname.startsWith("/sermons") || pathname.startsWith("/admin")) return null;
  return <ChurchFooter />;
}
