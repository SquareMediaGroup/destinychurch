// /links — the main links page, built in /admin/links. Chrome-free like /nfc
// (see the pathname gates in ChurchHeader, FooterGate and friends): the page
// is the whole interface.

import type { Metadata } from "next";
import LinkPageRoute, { linkPageMetadata } from "@/components/links/LinkPageRoute";
import { MAIN_SLUG } from "@/lib/linkPages/types";

export function generateMetadata(): Promise<Metadata> {
  return linkPageMetadata(MAIN_SLUG);
}

export default function LinksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LinkPageRoute slug={MAIN_SLUG} searchParams={searchParams} />;
}
