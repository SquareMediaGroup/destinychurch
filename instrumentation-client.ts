import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./sentry.shared";

// Browser-side error tracking. Errors only: no session replay, no cookies, no
// personal data (sendDefaultPii stays off), so it sits outside the cookie
// banner the way the error logs on the server do. Inert without the DSN.
Sentry.init(sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
