import * as Sentry from "@sentry/nextjs";

// Error tracking. Without SENTRY_DSN set this is inert: Sentry.init runs with
// `enabled: false` and nothing leaves the server. See sentry.shared.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const { sentryOptions } = await import("./sentry.shared");
    Sentry.init(sentryOptions(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN));
  }
}

// Every uncaught error in a server component, route handler, server action or
// middleware lands here, with the route it happened on.
export const onRequestError = Sentry.captureRequestError;
