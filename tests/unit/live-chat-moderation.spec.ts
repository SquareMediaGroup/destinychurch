import { test, expect } from "@playwright/test";
import {
  screenMessage,
  screenDisplayName,
  normaliseBody,
  checkChatRateLimit,
  resetChatRateLimit,
  MAX_MESSAGE_LENGTH,
} from "../../lib/liveChatModeration";

/**
 * The live chat is a public, pseudonymous room under a church stream, and there
 * is no way to know who is watching it. The rules in liveChatModeration.ts are
 * the reason it's safe to have at all, so they're checked here rather than
 * trusted — particularly the de-obfuscation, which is the part that silently
 * stops working the moment someone "tidies" the regexes.
 */

/* ── Links and contact details ────────────────────────────────────────────── */

test("links are rejected outright from guests", () => {
  for (const attempt of [
    "check out https://example.com",
    "go to www.example.com",
    "my site is example.co.uk now",
    "join me on discord.gg",
  ]) {
    expect(screenMessage(attempt).action, attempt).toBe("reject");
  }
});

test("email addresses and phone numbers are rejected", () => {
  expect(screenMessage("email me at bob@example.com").action).toBe("reject");
  expect(screenMessage("ring me on 07700 900123").action).toBe("reject");
});

test("hosts may post links — they have a real login behind them", () => {
  const verdict = screenMessage("Notes are at https://example.com/notes", "host");
  expect(verdict.action).toBe("allow");
});

/* ── The hold filter ──────────────────────────────────────────────────────── */

test("ordinary messages pass straight through", () => {
  for (const ok of [
    "Morning everyone!",
    "Watching from Middlesbrough today",
    "Praying for you all",
    "That was a great class on Sunday",
  ]) {
    expect(screenMessage(ok).action, ok).toBe("allow");
  }
});

test("profanity is held, not rejected — a probeable filter is a beatable one", () => {
  const verdict = screenMessage("what the fuck");
  expect(verdict.action).toBe("hold");
});

test("leetspeak and punctuation tricks do not walk past the filter", () => {
  for (const attempt of ["f.u.c.k", "sh1t", "f u c k", "b!tch", "$hit"]) {
    expect(screenMessage(attempt).action, attempt).toBe("hold");
  }
});

test("zero-width characters do not walk past the filter", () => {
  // A zero-width space mid-word reads identically to a human.
  expect(screenMessage("fu​ck").action).toBe("hold");
});

test("self-harm phrases are held so a host sees them fast", () => {
  for (const phrase of ["i want to die", "thinking about suicide", "kys"]) {
    expect(screenMessage(phrase).action, phrase).toBe("hold");
  }
});

test("innocent substrings are not caught", () => {
  // "class" contains "ass", "Scunthorpe" is the canonical case, "sextant"
  // contains "sex". None should trip a word-boundary match.
  for (const ok of ["great class today", "hello from Scunthorpe", "analysis"]) {
    expect(screenMessage(ok).action, ok).toBe("allow");
  }
});

/* ── Normalising ──────────────────────────────────────────────────────────── */

test("whitespace collapses and long character runs are trimmed", () => {
  expect(normaliseBody("  hello    there  ")).toBe("hello there");
  expect(normaliseBody("yesssssssss")).toBe("yesss");
});

test("empty and over-long messages are rejected", () => {
  expect(screenMessage("   ").action).toBe("reject");
  // Varied text, not one repeated character: normaliseBody deliberately
  // collapses long runs, so "a".repeat(501) is three characters by the time the
  // length check sees it.
  const longMessage = "lorem ipsum dolor sit amet ".repeat(30);
  expect(longMessage.length).toBeGreaterThan(MAX_MESSAGE_LENGTH);
  expect(screenMessage(longMessage).action).toBe("reject");
});

/* ── Display names ────────────────────────────────────────────────────────── */

test("ordinary names are accepted", () => {
  for (const name of ["Kai", "Sarah J", "Mary-Anne", "O'Brien"]) {
    const verdict = screenDisplayName(name);
    expect(verdict.ok, name).toBe(true);
  }
});

test("names that impersonate the church team are refused", () => {
  for (const name of ["Host", "Pastor Dave", "Admin", "Destiny Church", "M0derator"]) {
    const verdict = screenDisplayName(name);
    expect(verdict.ok, name).toBe(false);
  }
});

test("names that are too short, too long, or contain links are refused", () => {
  expect(screenDisplayName("K").ok).toBe(false);
  expect(screenDisplayName("a".repeat(25)).ok).toBe(false);
  expect(screenDisplayName("visit example.com").ok).toBe(false);
});

test("an accepted name comes back trimmed", () => {
  const verdict = screenDisplayName("  Kai   M  ");
  expect(verdict.ok).toBe(true);
  if (verdict.ok) expect(verdict.name).toBe("Kai M");
});

/* ── Rate limiting ────────────────────────────────────────────────────────── */

test("a second message straight after the first is refused", () => {
  const key = `test-burst-${Date.now()}`;
  resetChatRateLimit(key);

  expect(checkChatRateLimit(key).allowed).toBe(true);
  const second = checkChatRateLimit(key);
  expect(second.allowed).toBe(false);
  expect(second.retryAfterSeconds).toBeGreaterThan(0);

  resetChatRateLimit(key);
});

test("separate guests do not share a limit", () => {
  const a = `test-a-${Date.now()}`;
  const b = `test-b-${Date.now()}`;
  resetChatRateLimit(a);
  resetChatRateLimit(b);

  expect(checkChatRateLimit(a).allowed).toBe(true);
  expect(checkChatRateLimit(b).allowed).toBe(true);

  resetChatRateLimit(a);
  resetChatRateLimit(b);
});
