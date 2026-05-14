import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/loginRateLimit";

// Use a unique IP prefix per test file to avoid cross-test pollution from the
// shared in-memory store.
const IP = "192.0.2.1";

beforeEach(() => {
  resetRateLimit(IP);
});

describe("checkRateLimit — first request", () => {
  it("allows the first request from a new IP", () => {
    const result = checkRateLimit(IP);
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });
});

describe("checkRateLimit — within the limit", () => {
  it("allows up to 5 attempts", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(IP);
      expect(result.allowed).toBe(true);
    }
  });
});

describe("checkRateLimit — exceeding the limit", () => {
  it("blocks the 6th attempt", () => {
    for (let i = 0; i < 5; i++) checkRateLimit(IP);
    const blocked = checkRateLimit(IP);
    expect(blocked.allowed).toBe(false);
  });

  it("returns a positive retryAfterSeconds when blocked", () => {
    for (let i = 0; i < 5; i++) checkRateLimit(IP);
    const blocked = checkRateLimit(IP);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    // Should be close to 15 minutes (900 seconds)
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(900);
  });

  it("continues blocking on further attempts", () => {
    for (let i = 0; i < 5; i++) checkRateLimit(IP);
    checkRateLimit(IP); // 6th
    const blocked = checkRateLimit(IP); // 7th
    expect(blocked.allowed).toBe(false);
  });
});

describe("resetRateLimit", () => {
  it("allows requests again after a reset", () => {
    for (let i = 0; i < 5; i++) checkRateLimit(IP);
    expect(checkRateLimit(IP).allowed).toBe(false);

    resetRateLimit(IP);
    expect(checkRateLimit(IP).allowed).toBe(true);
  });

  it("is a no-op for an IP that was never rate-limited", () => {
    resetRateLimit("192.0.2.99"); // should not throw
    expect(checkRateLimit("192.0.2.99").allowed).toBe(true);
    resetRateLimit("192.0.2.99");
  });
});

describe("checkRateLimit — different IPs are tracked independently", () => {
  it("exhausting one IP does not affect another", () => {
    const otherIp = "192.0.2.2";
    resetRateLimit(otherIp);

    for (let i = 0; i < 5; i++) checkRateLimit(IP);
    expect(checkRateLimit(IP).allowed).toBe(false);

    expect(checkRateLimit(otherIp).allowed).toBe(true);
    resetRateLimit(otherIp);
  });
});
