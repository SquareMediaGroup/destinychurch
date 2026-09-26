// @destiny/shared — types and framework-agnostic logic shared between the web
// app (`app/`, `lib/`) and the app BFF (`app/api/app/v1/*`). Keep this package
// free of framework-specific imports (no `next`, no React) so every consumer
// can use it.
//
// The iOS app in `mobile/` is native Swift and cannot import TypeScript, so it
// consumes this logic indirectly: the BFF does all the normalisation here and
// serves the app plain JSON. That is why the BFF, not the client, owns things
// like absolute image URLs and timezone-qualified timestamps.

export * from "./churchsuite/events";
export * from "./churchsuite/dates";
export * from "./churchsuite/series";
export * from "./churchsuite/sanitize";
export * from "./churchsuite/ics";
export * from "./design/tokens";

// Destiny One (the Expo messaging app, apps/destiny-one) — wire types, the
// pure safeguarding rules, and the typed API client. Unlike the Swift app,
// Destiny One is TypeScript and imports these directly.
export * from "./destinyOne/types";
export * from "./destinyOne/policy";
export * from "./destinyOne/client";
