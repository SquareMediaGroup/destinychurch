// Is this pathname a links page? Client-safe — the site chrome components
// (ChurchHeader, FooterGate, banners, popups, Smart Search) use it to stand
// aside, the way they already do for /nfc: a links page is the whole interface.
export function isLinksPagePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/links" || pathname.startsWith("/links/");
}

// /song-requests is the same kind of page: a phone-first party tool reached by
// QR code, so the site chrome stands aside for it too.
export function isSongRequestsPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/song-requests" || pathname.startsWith("/song-requests/");
}

// /talent-show (audience voting, reached by QR code) and its big-screen
// results page are the whole interface too.
export function isTalentShowPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === "/talent-show" || pathname.startsWith("/talent-show/");
}
