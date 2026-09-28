// The footer's "Legal" pages (minus Contact Us). Client-safe — the banner
// components use it to stay off policy pages, which should read as plain
// documents without promo or live bars over them.
const LEGAL_PATHS = [
  "/governance",
  "/data-gdpr",
  "/safeguarding",
  "/terms",
  "/privacy",
  "/accessibility",
];

export function isLegalPagePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return LEGAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
