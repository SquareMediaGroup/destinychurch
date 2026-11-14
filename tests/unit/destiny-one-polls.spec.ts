import { test, expect } from "@playwright/test";
import { pollResultText } from "../../lib/destinyOne/polls";

const options = [
  { id: "o1", label: "Saturday 10am" },
  { id: "o2", label: "Sunday 2pm" },
  { id: "o3", label: "Friday night" },
];

test.describe("poll result text", () => {
  test("a clear winner", () => {
    expect(pollResultText(options, [{ optionId: "o1", count: 8 }, { optionId: "o2", count: 3 }], 11)).toBe(
      "Poll closed: Saturday 10am won with 8 votes (11 people voted).",
    );
  });

  test("one vote is singular", () => {
    expect(pollResultText(options, [{ optionId: "o2", count: 1 }], 1)).toBe("Poll closed: Sunday 2pm won with 1 vote (1 person voted).");
  });

  test("nobody voted", () => {
    expect(pollResultText(options, [], 0)).toBe("Poll closed: nobody voted.");
  });

  test("a tie names every option that tied", () => {
    expect(pollResultText(options, [{ optionId: "o1", count: 4 }, { optionId: "o3", count: 4 }, { optionId: "o2", count: 1 }], 9)).toBe(
      "Poll closed: Saturday 10am and Friday night tied with 4 votes each.",
    );
    expect(pollResultText(options, [{ optionId: "o1", count: 2 }, { optionId: "o2", count: 2 }, { optionId: "o3", count: 2 }], 6)).toBe(
      "Poll closed: Saturday 10am, Sunday 2pm and Friday night tied with 2 votes each.",
    );
  });

  test("a vote for an option that is no longer on the poll is ignored", () => {
    expect(pollResultText(options, [{ optionId: "gone", count: 9 }, { optionId: "o2", count: 2 }], 5)).toBe(
      "Poll closed: Sunday 2pm won with 2 votes (5 people voted).",
    );
  });
});
