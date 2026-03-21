"use client";

import { usePathname } from "next/navigation";
import ChurchFooter from "./ChurchFooter";

export default function FooterGate() {
  const pathname = usePathname();
  if (pathname.startsWith("/sermons")) return null;
  return <ChurchFooter />;
}
