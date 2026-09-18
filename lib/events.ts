// Client-safe event helpers. Anything touching Supabase or the ChurchSuite
// fetch lives in lib/events.server.ts; this file is importable from client
// components.

/** Slugs a real ChurchSuite event may not claim, because a route owns them. */
export const RESERVED_EVENT_SLUGS: ReadonlySet<string> = new Set([]);
