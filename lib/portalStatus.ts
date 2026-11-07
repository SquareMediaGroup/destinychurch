// The staff self-service portal (/portal + /api/portal) is closed until it
// relaunches. One switch for every place that has to know:
//
//   - middleware.ts           /api/portal/* answers 404; /portal/* lands on /portal
//   - app/portal/layout.tsx   renders the "Coming Summer 2027" panel instead of the pages
//   - app/portal/design/request/actions.ts   refuses submissions (server actions
//     can be called by ID from any route, so the middleware alone isn't enough)
//   - app/login/LoginClient.tsx   the Portal card reads "Coming Summer 2027"
//   - app/admin/design/page.tsx   hides the "Request form" button
//   - lib/hrEmail.ts          leave decision emails drop the "View my leave" link
//
// To reopen: set PORTAL_OPEN to true. Nothing else needs undoing.
// Closed 2026-11-04 — part of shrinking the attack surface while two-factor
// sign-in isn't in place yet.

export const PORTAL_OPEN = false;

/** Shown wherever the portal is mentioned while it is closed. */
export const PORTAL_REOPENS = "Summer 2027";
