// React's <ViewTransition> ships in the React build the App Router runs on
// (next/dist/compiled/react, which `react` is aliased to), but its types live
// in the canary declarations rather than @types/react's default entry point.
//
// One reference pulls them in project-wide, which beats hand-writing an
// augmentation that would then have to be kept in step with the real signature.
// See app/admin/template.tsx for the only place we use it.

/// <reference types="react/canary" />

export {};
