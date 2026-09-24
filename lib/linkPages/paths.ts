// Is this pathname a links page? Client-safe — the site chrome components
// (ChurchHeader, FooterGate, banners, popups, Smart Search) use it to stand
// aside, the way they already do for /nfc: a links page is the whole interface.
export function isLinksPagePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/links" || pathname.startsWith("/links/");
}
