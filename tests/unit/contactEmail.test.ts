import { describe, it, expect } from "vitest";
import { getTheme, buildContactEmailHtml } from "@/lib/contact-email";

describe("getTheme", () => {
  it("returns red accent for Safeguarding", () => {
    const t = getTheme("Safeguarding");
    expect(t.accentColor).toBe("#ef4444");
    expect(t.badgeLabel).toBe("Safeguarding");
    expect(t.headline).toBe("Safeguarding Report");
  });

  it("returns blue accent for Privacy", () => {
    const t = getTheme("Privacy");
    expect(t.accentColor).toBe("#3b82f6");
    expect(t.badgeLabel).toBe("Privacy");
  });

  it("returns amber accent for Complaints", () => {
    const t = getTheme("Complaints");
    expect(t.accentColor).toBe("#f59e0b");
    expect(t.badgeLabel).toBe("Complaint");
  });

  it("returns orange accent for Enquiries", () => {
    const t = getTheme("Enquiries");
    expect(t.accentColor).toBe("#F58021");
    expect(t.badgeLabel).toBe("Enquiry");
  });

  it("returns default orange theme for unknown subjects", () => {
    const t = getTheme("Other");
    expect(t.accentColor).toBe("#F58021");
    expect(t.badgeLabel).toBe("Contact Form");
    expect(t.headline).toBe("New Message Received");
  });

  it("returns default theme for empty string", () => {
    const t = getTheme("");
    expect(t.badgeLabel).toBe("Contact Form");
  });

  it("every theme has all required fields", () => {
    const subjects = ["Safeguarding", "Privacy", "Complaints", "Enquiries", "Other"];
    for (const s of subjects) {
      const t = getTheme(s);
      expect(t.accentColor).toBeTruthy();
      expect(t.accentShadow).toBeTruthy();
      expect(t.badgeLabel).toBeTruthy();
      expect(t.headline).toBeTruthy();
      expect(t.intro).toBeTruthy();
      expect(t.bgGradient).toBeTruthy();
    }
  });
});

describe("buildContactEmailHtml", () => {
  it("includes the sender name in the output", () => {
    const html = buildContactEmailHtml("Alice Smith", "alice@example.com", "Enquiries", "Hello");
    expect(html).toContain("Alice Smith");
  });

  it("includes the sender email", () => {
    const html = buildContactEmailHtml("Bob", "bob@example.com", "Privacy", "Hi");
    expect(html).toContain("bob@example.com");
  });

  it("includes the message body", () => {
    const html = buildContactEmailHtml("Carol", "c@example.com", "Other", "Test message content");
    expect(html).toContain("Test message content");
  });

  it("escapes HTML special characters in name", () => {
    const html = buildContactEmailHtml("<script>", "a@b.com", "Other", "msg");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes HTML special characters in email", () => {
    const html = buildContactEmailHtml("Name", "<bad>@x.com", "Other", "msg");
    expect(html).not.toContain("<bad>");
    expect(html).toContain("&lt;bad&gt;");
  });

  it("escapes HTML special characters in message", () => {
    const html = buildContactEmailHtml("Name", "a@b.com", "Other", "Hello <world> & more");
    expect(html).toContain("Hello &lt;world&gt; &amp; more");
  });

  it("converts newlines to <br /> in message", () => {
    const html = buildContactEmailHtml("Name", "a@b.com", "Other", "Line1\nLine2");
    expect(html).toContain("Line1<br />Line2");
  });

  it("uses the correct accent colour for Safeguarding subject", () => {
    const html = buildContactEmailHtml("Name", "a@b.com", "Safeguarding", "concern");
    expect(html).toContain("#ef4444");
  });

  it("produces valid HTML with doctype and html tags", () => {
    const html = buildContactEmailHtml("Name", "a@b.com", "Other", "msg");
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("</html>");
  });

  it("includes a reply mailto link", () => {
    const html = buildContactEmailHtml("Name", "reply@example.com", "Other", "msg");
    expect(html).toContain("mailto:reply@example.com");
  });
});
