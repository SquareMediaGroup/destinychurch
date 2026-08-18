import { test, expect } from "@playwright/test";

/**
 * The guest cookie is the whole identity model for the live chat: no account, no
 * email, just a signed blob. Two properties have to hold or the moderation tools
 * are decorative —
 *
 *   a guest cannot change their id (that's what a mute is applied to), and
 *   a guest cannot derive anyone else's DM channel key.
 *
 * The signing secret is read at module load, so it's set before the import.
 */
process.env.SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || "unit-test-signing-secret";

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  newGuest,
  signGuest,
  verifyGuest,
  dmKeyFor,
  dmTopic,
  publicTopic,
  hostTopic,
} = require("../../lib/liveChatGuest") as typeof import("../../lib/liveChatGuest");

test("a signed cookie round-trips", () => {
  const identity = newGuest("Kai");
  const restored = verifyGuest(signGuest(identity));

  expect(restored).not.toBeNull();
  expect(restored!.id).toBe(identity.id);
  expect(restored!.name).toBe("Kai");
});

test("a tampered payload is rejected", () => {
  const identity = newGuest("Kai");
  const token = signGuest(identity);

  // Re-encode the body with a different id, keeping the original signature —
  // exactly what someone evading a mute would try.
  const [, signature] = token.split(".");
  const forgedBody = Buffer.from(
    JSON.stringify({ ...identity, id: "somebody-else" }),
    "utf8",
  ).toString("base64url");

  expect(verifyGuest(`${forgedBody}.${signature}`)).toBeNull();
});

test("a tampered signature is rejected", () => {
  const token = signGuest(newGuest("Kai"));
  const [body] = token.split(".");
  expect(verifyGuest(`${body}.${"0".repeat(64)}`)).toBeNull();
});

test("junk and missing tokens are rejected rather than throwing", () => {
  expect(verifyGuest(undefined)).toBeNull();
  expect(verifyGuest("")).toBeNull();
  expect(verifyGuest("not-a-token")).toBeNull();
  expect(verifyGuest("....")).toBeNull();
});

test("renaming keeps the id, so a mute survives a name change", () => {
  const identity = newGuest("Kai");
  const renamed = verifyGuest(signGuest({ ...identity, name: "Someone Else" }));

  expect(renamed).not.toBeNull();
  expect(renamed!.id).toBe(identity.id);
  expect(renamed!.name).toBe("Someone Else");
});

test("a DM key is stable for a guest and different between guests", () => {
  const a = newGuest("A");
  const b = newGuest("B");

  expect(dmKeyFor(a.id)).toBe(dmKeyFor(a.id));
  expect(dmKeyFor(a.id)).not.toBe(dmKeyFor(b.id));
});

test("a DM key does not leak the guest id it came from", () => {
  const guest = newGuest("Kai");
  const key = dmKeyFor(guest.id);

  expect(key).not.toContain(guest.id);
  // 32 hex characters — matches the ^…:dm:[0-9a-f]{32}$ policy in the migration.
  expect(key).toMatch(/^[0-9a-f]{32}$/);
});

test("topics match the shapes the realtime.messages policies allow", () => {
  const sessionId = "3f7c1a2e-5b6d-4e8f-9a0b-1c2d3e4f5a6b";
  const guest = newGuest("Kai");

  expect(publicTopic(sessionId)).toMatch(/^live-chat:[0-9a-f-]{36}:public$/);
  expect(hostTopic(sessionId)).toMatch(/^live-chat:[0-9a-f-]{36}:host$/);
  expect(dmTopic(sessionId, guest.id)).toMatch(
    /^live-chat:[0-9a-f-]{36}:dm:[0-9a-f]{32}$/,
  );
});

test("the three topic shapes cannot be confused for one another", () => {
  const sessionId = "3f7c1a2e-5b6d-4e8f-9a0b-1c2d3e4f5a6b";
  const guest = newGuest("Kai");

  // The policies are anchored regexes precisely so a crafted topic can't match
  // two of them; assert the anchoring actually holds.
  expect(dmTopic(sessionId, guest.id)).not.toMatch(/^live-chat:[0-9a-f-]{36}:public$/);
  expect(hostTopic(sessionId)).not.toMatch(/^live-chat:[0-9a-f-]{36}:public$/);
  expect(publicTopic(sessionId)).not.toMatch(/^live-chat:[0-9a-f-]{36}:host$/);
});
