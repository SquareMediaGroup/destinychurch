import { test, expect } from "@playwright/test";
import { sanitizeEventHtml } from "../../packages/shared/src/churchsuite/sanitize";
import { jsonLdHtml } from "../../lib/jsonLd";

/**
 * ChurchSuite event descriptions are rendered with dangerouslySetInnerHTML on
 * /whats-on/[slug] and sent to the app as descriptionHtml. The rewriter keeps a
 * small allowlist of tags; these pin down that nothing outside it survives,
 * including markup the feed never closed.
 */

test.describe("sanitizeEventHtml", () => {
  test("keeps the allowed tags and drops every attribute but href", () => {
    expect(sanitizeEventHtml('<h2 class="branded">Hi</h2><p style="color:red">There <a href="https://example.com" onclick="x()">link</a></p>')).toBe(
      '<h3>Hi</h3><p>There <a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a></p>',
    );
  });

  test("drops scripts, handlers and unsafe links", () => {
    const out = sanitizeEventHtml('<p>a<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">b</a></p>');
    expect(out).toBe("<p>ab</p>");
  });

  test("a tag the feed never closed can't be completed by the closing tags we add", () => {
    // Before the fix this came out as `<p>hello <img src=x onerror=alert(1) </p>`,
    // which a browser reads as an <img> with an onerror handler.
    for (const open of ["<img src=x onerror=alert(1) ", "<script src=//evil.example/x.js ", "<svg onload=alert(1) "]) {
      const out = sanitizeEventHtml(`<p>hello ${open}`);
      expect(out).not.toMatch(/<(img|script|svg)/i);
      expect(out.startsWith("<p>hello &lt;")).toBe(true);
      expect(out.endsWith("</p>")).toBe(true);
    }
  });

  test("stray angle brackets in text are written as entities", () => {
    expect(sanitizeEventHtml("<p>ages 5 < 11 > toddlers</p>")).toBe("<p>ages 5 &lt; 11 &gt; toddlers</p>");
  });

  test("existing entities are left alone", () => {
    expect(sanitizeEventHtml("<p>Tea &amp; cake</p>")).toBe("<p>Tea &amp; cake</p>");
  });
});

test.describe("jsonLdHtml", () => {
  test("a value can't end the script block", () => {
    const html = jsonLdHtml({ name: "</script><script>alert(1)</script>" });
    expect(html).not.toContain("<");
    expect(JSON.parse(html)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});
