import { describe, it, expect } from "vitest";
import { errorsTouchFiles, extractErrorsForFiles } from "@/lib/ai/code-validator";

const SAMPLE_OUTPUT = `app/foo/page.tsx(12,4): error TS2322: Type 'string' is not assignable to type 'number'.
app/bar/component.tsx(5,10): error TS2345: Argument of type 'null' is not assignable to parameter.
lib/utils.ts(3,1): error TS2304: Cannot find name 'foo'.
Just a warning line without an error code.`;

describe("errorsTouchFiles", () => {
  it("returns false for empty output", () => {
    expect(errorsTouchFiles("", ["app/foo/page.tsx"])).toBe(false);
  });

  it("returns true when a matching file has a TS error", () => {
    expect(errorsTouchFiles(SAMPLE_OUTPUT, ["app/foo/page.tsx"])).toBe(true);
  });

  it("returns true when a second file in the list matches", () => {
    expect(errorsTouchFiles(SAMPLE_OUTPUT, ["app/bar/component.tsx"])).toBe(true);
  });

  it("returns false when no files match", () => {
    expect(errorsTouchFiles(SAMPLE_OUTPUT, ["app/other/page.tsx"])).toBe(false);
  });

  it("matches partial path segments", () => {
    expect(errorsTouchFiles(SAMPLE_OUTPUT, ["lib/utils.ts"])).toBe(true);
  });

  it("returns false when file is mentioned but on a non-error line", () => {
    const output = "Just a warning mentioning app/foo/page.tsx without error code.";
    expect(errorsTouchFiles(output, ["app/foo/page.tsx"])).toBe(false);
  });
});

describe("extractErrorsForFiles", () => {
  it("returns empty string for empty output", () => {
    expect(extractErrorsForFiles("", ["app/foo/page.tsx"])).toBe("");
  });

  it("extracts lines that mention a target file", () => {
    const result = extractErrorsForFiles(SAMPLE_OUTPUT, ["app/foo/page.tsx"]);
    expect(result).toContain("app/foo/page.tsx");
    expect(result).not.toContain("app/bar/component.tsx");
  });

  it("extracts lines for multiple target files", () => {
    const result = extractErrorsForFiles(SAMPLE_OUTPUT, [
      "app/foo/page.tsx",
      "app/bar/component.tsx",
    ]);
    expect(result).toContain("app/foo/page.tsx");
    expect(result).toContain("app/bar/component.tsx");
  });

  it("includes a generic TS error line when no file-specific lines matched yet", () => {
    const output = "lib/utils.ts(3,1): error TS2304: Cannot find name 'foo'.";
    const result = extractErrorsForFiles(output, ["app/nonexistent.tsx"]);
    // generic error should be kept as context for the first error
    expect(result).toContain("error TS2304");
  });

  it("respects the maxLines cap", () => {
    const manyLines = Array.from({ length: 200 }, (_, i) =>
      `app/foo/page.tsx(${i},1): error TS2322: too many.`
    ).join("\n");
    const result = extractErrorsForFiles(manyLines, ["app/foo/page.tsx"], 10);
    const lines = result.split("\n").filter(Boolean);
    expect(lines.length).toBeLessThanOrEqual(10);
  });

  it("returns an empty string when no lines match and there are no generic errors", () => {
    const output = "No errors here at all.";
    const result = extractErrorsForFiles(output, ["app/foo/page.tsx"]);
    expect(result).toBe("");
  });
});
