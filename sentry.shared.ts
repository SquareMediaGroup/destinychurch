import type { BrowserOptions, NodeOptions } from "@sentry/nextjs";

/**
 * One set of Sentry options for the server, edge and browser.
 *
 * - No DSN, no Sentry: local dev and any environment without the variable
 *   send nothing.
 * - Errors only. Performance tracing is off (tracesSampleRate 0) to stay well
 *   inside the free plan, and there is no session replay.
 * - Personal data stays here. The SDK collects users, cookies, headers,
 *   bodies, query strings, local variables and DB parameters by default; all
 *   of it is switched off below (HR, safeguarding and member data flow through
 *   these code paths). Errors can still carry an email address in their
 *   message, so anything that looks like one is scrubbed before it leaves.
 */
export function sentryOptions(dsn: string | undefined): NodeOptions & BrowserOptions {
  const environment =
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  return {
    dsn,
    enabled: !!dsn,
    environment,
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      genAI: { inputs: false, outputs: false },
    },
    beforeSend(event) {
      if (event.message) event.message = scrubEmails(event.message);
      for (const ex of event.exception?.values ?? []) {
        if (ex.value) ex.value = scrubEmails(ex.value);
      }
      return event;
    },
  };
}

const EMAIL_RE = /[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}/gi;

function scrubEmails(text: string): string {
  return text.replace(EMAIL_RE, "[email]");
}
