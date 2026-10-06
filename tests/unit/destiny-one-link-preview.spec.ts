import { test, expect } from "@playwright/test";
import { firstUrl, isPublicAddress, parsePreview } from "../../lib/destinyOne/linkPreview";

test.describe("firstUrl", () => {
  test("finds the first http(s) link and drops trailing punctuation", () => {
    expect(firstUrl("See https://destinytees.uk/events, then reply.")).toBe("https://destinytees.uk/events");
    expect(firstUrl("(http://example.com/a?b=1)")).toBe("http://example.com/a?b=1");
  });
  test("nothing for no link, other schemes, or links with a password", () => {
    expect(firstUrl("no links here")).toBeNull();
    expect(firstUrl("ftp://example.com")).toBeNull();
    expect(firstUrl("https://user:pw@example.com")).toBeNull();
    expect(firstUrl(null)).toBeNull();
  });
});

test.describe("parsePreview", () => {
  const html = `<html><head><title>Fallback</title>
    <meta property="og:title" content="Youth Night &amp; Pizza">
    <meta property='og:description' content='Friday at 7'>
    <meta property="og:image" content="/img/youth.jpg">
    <meta property="og:site_name" content="Destiny Church">
  </head></html>`;
  test("reads Open Graph tags and resolves the image against the page", () => {
    expect(parsePreview(html, "https://destinytees.uk/youth")).toEqual({
      url: "https://destinytees.uk/youth",
      title: "Youth Night & Pizza",
      description: "Friday at 7",
      siteName: "Destiny Church",
      imageUrl: "https://destinytees.uk/img/youth.jpg",
    });
  });
  test("falls back to <title> and the host name; drops an http image", () => {
    const p = parsePreview(`<title>Just a page</title><meta name="og:image" content="http://insecure.test/x.png">`, "https://www.example.org/x");
    expect(p).toEqual({ url: "https://www.example.org/x", title: "Just a page", description: null, siteName: "example.org", imageUrl: null });
  });
  test("no title, no preview", () => {
    expect(parsePreview("<html><body>hi</body></html>", "https://example.org")).toBeNull();
  });
});

test.describe("isPublicAddress", () => {
  test("refuses internal, private and metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"]) {
      expect(isPublicAddress(ip), ip).toBe(false);
    }
  });
  test("allows ordinary public addresses", () => {
    for (const ip of ["8.8.8.8", "104.16.0.1", "2606:4700::1111", "::ffff:1.1.1.1"]) {
      expect(isPublicAddress(ip), ip).toBe(true);
    }
  });
});
