import { expect, test } from "@playwright/test";
import { DESTINY_AI, canPost, mentionSegments, mentionsDestinyAI, stripDestinyAIMention } from "@destiny/shared";

// DestinyAI: "@DestinyAI" in a group asks it something (lib/destinyOne/assistant.server.ts).

test.describe("mentionsDestinyAI", () => {
  test("finds the tag anywhere, in any capitalisation", () => {
    expect(mentionsDestinyAI("@DestinyAI when is youth?")).toBe(true);
    expect(mentionsDestinyAI("hey @destinyai, what time is it on")).toBe(true);
    expect(mentionsDestinyAI("what's on this week? @DestinyAI")).toBe(true);
    expect(mentionsDestinyAI("(@DESTINYAI)")).toBe(true);
  });

  test("ignores email addresses, longer names and no tag", () => {
    expect(mentionsDestinyAI("me@destinyai.com")).toBe(false);
    expect(mentionsDestinyAI("@DestinyAIs are great")).toBe(false);
    expect(mentionsDestinyAI("DestinyAI without the at")).toBe(false);
    expect(mentionsDestinyAI(null)).toBe(false);
    expect(mentionsDestinyAI("")).toBe(false);
  });
});

test("stripDestinyAIMention leaves just the question", () => {
  expect(stripDestinyAIMention("@DestinyAI when is youth?")).toBe("when is youth?");
  expect(stripDestinyAIMention("hey @destinyai, what time")).toBe("hey what time");
  expect(stripDestinyAIMention("is this right @DestinyAI")).toBe("is this right");
  expect(stripDestinyAIMention("@DestinyAI")).toBe("");
});

test("the tag is drawn as a mention", () => {
  const parts = mentionSegments("@DestinyAI what's on?", [DESTINY_AI]);
  expect(parts[0]).toEqual({ text: "@DestinyAI", mention: DESTINY_AI });
});

test("anyone active can post in their DestinyAI chat", () => {
  const member = { id: "m", status: "active", roles: [], isAdult: false } as unknown as Parameters<typeof canPost>[0]["member"];
  expect(canPost({ member, groupKind: "assistant", groupState: "active", myRole: "member" })).toBe(true);
  expect(canPost({ member, groupKind: "assistant", groupState: "frozen", myRole: "member" })).toBe(false);
});
