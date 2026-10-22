import { test, expect } from "@playwright/test";
import { randomBytes, scryptSync } from "node:crypto";

process.env.EMERGENCY_SESSION_SECRET = "x".repeat(40);
process.env.EMERGENCY_LOGIN_EMAIL = "breakglass@example.test";

import {
  createEmergencyToken,
  EMERGENCY_SESSION_SECONDS,
  verifyEmergencyToken,
} from "../../lib/emergencyAccess";
import { verifyEmergencyPassword } from "../../lib/emergencyPassword.server";

/**
 * The break-glass sign-in: a session cookie nobody can forge or keep past its
 * lifetime, and a password check in the same format the hash script writes.
 */

test("a fresh token verifies and carries the email", async () => {
  const token = await createEmergencyToken("breakglass@example.test");
  expect(await verifyEmergencyToken(token)).toEqual({ email: "breakglass@example.test" });
});

test("a tampered token is rejected", async () => {
  const token = await createEmergencyToken("breakglass@example.test");
  const [, signature] = token.split(".");
  const forged = `${Buffer.from(JSON.stringify({ email: "x@example.test", expires: 9999999999 })).toString("base64url")}.${signature}`;
  expect(await verifyEmergencyToken(forged)).toBeNull();
  expect(await verifyEmergencyToken(`${token}x`)).toBeNull();
  expect(await verifyEmergencyToken(undefined)).toBeNull();
});

test("a token stops working when it expires", async () => {
  const issued = Date.now();
  const token = await createEmergencyToken("breakglass@example.test", issued);
  const later = issued + EMERGENCY_SESSION_SECONDS * 1000 + 1000;
  expect(await verifyEmergencyToken(token, later)).toBeNull();
});

test("a token signed with another secret is rejected", async () => {
  const token = await createEmergencyToken("breakglass@example.test");
  process.env.EMERGENCY_SESSION_SECRET = "y".repeat(40);
  try {
    expect(await verifyEmergencyToken(token)).toBeNull();
  } finally {
    process.env.EMERGENCY_SESSION_SECRET = "x".repeat(40);
  }
});

test("the password check accepts the hash script's format and nothing else", async () => {
  const salt = randomBytes(16);
  const hash = `scrypt:${salt.toString("hex")}:${scryptSync("correct horse battery", salt, 64).toString("hex")}`;
  expect(await verifyEmergencyPassword("correct horse battery", hash)).toBe(true);
  expect(await verifyEmergencyPassword("wrong password here", hash)).toBe(false);
  expect(await verifyEmergencyPassword("correct horse battery", "plaintext")).toBe(false);
});
