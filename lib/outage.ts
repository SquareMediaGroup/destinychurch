// Outage tracking for the two services the public site reads from: our data
// store and the church calendar feed.
//
// Two jobs:
//
// 1. A circuit breaker for the data store. Once a request to it fails at the
//    network level (or times out, or gets a gateway error), every request for
//    the next OUTAGE_WINDOW_MS fails immediately instead of waiting. Without
//    this, every page sat through each query's retries and took ~14s to load
//    during an outage (and never loaded at all if the outage hung).
// 2. A record the root layout reads to decide whether to show the outage
//    notice banner (see `getOutageState`).
//
// The state is per server instance, not global. That's fine for both jobs:
// each instance finds out on its own first failed request, and the layout's
// own queries run on every request, so a page is never rendered without the
// state having just been checked.

export const STATUS_PAGE_URL = "https://status.destinytees.uk";

/** How long one failure keeps the breaker open / the banner up. */
const OUTAGE_WINDOW_MS = 30_000;
/** Reads (GET/HEAD) give up after this long. Writes and uploads are left alone. */
const READ_TIMEOUT_MS = 6_000;

type Service = "data" | "events";

const lastFailure: Record<Service, number> = { data: 0, events: 0 };

export function markOutage(service: Service) {
  lastFailure[service] = Date.now();
}

export function clearOutage(service: Service) {
  lastFailure[service] = 0;
}

function isDown(service: Service) {
  return Date.now() - lastFailure[service] < OUTAGE_WINDOW_MS;
}

export function getOutageState() {
  return { data: isDown("data"), events: isDown("events") };
}

/**
 * Thrown in place of a request while the breaker is open. A TypeError, like a
 * real network failure, so every caller's existing error handling applies.
 */
export class ServiceUnavailableError extends TypeError {
  constructor() {
    super("Service temporarily unavailable");
    this.name = "ServiceUnavailableError";
  }
}

// Statuses from the gateway in front of the data store rather than from the
// API itself: 502/503/504, and Cloudflare's 520-526 range.
function isGatewayFailure(status: number) {
  return status === 502 || status === 503 || status === 504 || (status >= 520 && status <= 526);
}

/** `fetch` for the data-store clients: times out reads and trips the breaker. */
export const resilientFetch: typeof fetch = async (input, init) => {
  if (isDown("data")) throw new ServiceUnavailableError();

  const method = (
    init?.method ?? (input instanceof Request ? input.method : "GET")
  ).toUpperCase();
  const isRead = method === "GET" || method === "HEAD";
  const timeout = isRead ? AbortSignal.timeout(READ_TIMEOUT_MS) : null;
  const signal =
    timeout && init?.signal ? AbortSignal.any([init.signal, timeout]) : (timeout ?? init?.signal);

  let res: Response;
  try {
    res = await fetch(input, { ...init, signal });
  } catch (err) {
    // The caller cancelling its own request says nothing about the service.
    if (!init?.signal?.aborted) markOutage("data");
    throw err;
  }

  if (isGatewayFailure(res.status)) markOutage("data");
  else clearOutage("data");
  return res;
};
