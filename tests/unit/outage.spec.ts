import { test, expect } from "@playwright/test";
import {
  clearOutage,
  getOutageState,
  resilientFetch,
  ServiceUnavailableError,
} from "../../lib/outage";

/**
 * The breaker behind the outage banner and the fail-fast data clients. These
 * pin the two promises it makes: a down service is only waited on once, and
 * one bad query or a caller's own cancel doesn't take the whole site "down".
 */

const realFetch = globalThis.fetch;
let calls = 0;

function stubFetch(impl: () => Promise<Response>) {
  calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return impl();
  }) as typeof fetch;
}

test.afterEach(() => {
  globalThis.fetch = realFetch;
  clearOutage("data");
  clearOutage("events");
});

test("a network failure trips the breaker and later calls fail without a request", async () => {
  stubFetch(() => Promise.reject(new TypeError("fetch failed")));
  await expect(resilientFetch("https://example.test/rest/v1/x")).rejects.toThrow("fetch failed");
  expect(getOutageState().data).toBe(true);

  await expect(resilientFetch("https://example.test/rest/v1/y")).rejects.toBeInstanceOf(
    ServiceUnavailableError,
  );
  expect(calls).toBe(1);
});

test("a gateway error trips the breaker but still returns the response", async () => {
  stubFetch(async () => new Response("", { status: 503 }));
  const res = await resilientFetch("https://example.test/rest/v1/x");
  expect(res.status).toBe(503);
  expect(getOutageState().data).toBe(true);
});

test("an ordinary API error does not count as an outage", async () => {
  stubFetch(async () => new Response("{}", { status: 400 }));
  await resilientFetch("https://example.test/rest/v1/x");
  expect(getOutageState().data).toBe(false);
});

test("the caller cancelling its own request does not count as an outage", async () => {
  stubFetch(() => Promise.reject(new DOMException("aborted", "AbortError")));
  const controller = new AbortController();
  controller.abort();
  await expect(
    resilientFetch("https://example.test/rest/v1/x", { signal: controller.signal }),
  ).rejects.toThrow();
  expect(getOutageState().data).toBe(false);
});
