import { test, expect } from "@playwright/test";
import { findMentions, mentionQuery, mentionSegments, mentionSuggestions } from "@destiny/shared";

const leah = { id: "a", displayName: "Leah Simmons" };
const leahS = { id: "b", displayName: "Leah" };
const jon = { id: "c", displayName: "Jonathan O'Neill" };
const people = [leah, leahS, jon];

test.describe("findMentions", () => {
  test("finds whole names, longest first", () => {
    expect(findMentions("Thanks @Leah Simmons!", people)).toEqual(["a"]);
    expect(findMentions("@Leah can you help", people)).toEqual(["b"]);
    expect(findMentions("@Leah Simmons and @Jonathan O'Neill", people)).toEqual(["a", "c"]);
  });
  test("ignores partial names, email addresses and repeats", () => {
    expect(findMentions("@Leahs here", people)).toEqual([]);
    expect(findMentions("mail leah@Leah Simmons.com", people)).toEqual([]);
    expect(findMentions("@Leah @Leah", people)).toEqual(["b"]);
  });
});

test.describe("mentionSegments", () => {
  test("splits text around mentions", () => {
    expect(mentionSegments("Hi @Leah Simmons, see you", people)).toEqual([
      { text: "Hi ", mention: null },
      { text: "@Leah Simmons", mention: leah },
      { text: ", see you", mention: null },
    ]);
  });
  test("plain text is one segment", () => {
    expect(mentionSegments("No one here", people)).toEqual([{ text: "No one here", mention: null }]);
  });
});

test.describe("mentionQuery", () => {
  test("the @word being typed at the cursor", () => {
    expect(mentionQuery("Hi @Le", 6)).toEqual({ start: 3, query: "Le" });
    expect(mentionQuery("@", 1)).toEqual({ start: 0, query: "" });
    expect(mentionQuery("Hi @Leah Si", 11)).toEqual({ start: 3, query: "Leah Si" });
  });
  test("not inside an email address, after a new line, or once finished", () => {
    expect(mentionQuery("leah@exa", 8)).toBeNull();
    expect(mentionQuery("@Leah\nhi", 8)).toBeNull();
    expect(mentionQuery("Hi there", 8)).toBeNull();
  });
});

test.describe("mentionSuggestions", () => {
  test("matches the start of any word in a name", () => {
    expect(mentionSuggestions("sim", people)).toEqual([leah]);
    expect(mentionSuggestions("jo", people)).toEqual([jon]);
    expect(mentionSuggestions("", people, 2)).toEqual([leah, leahS]);
  });
});
