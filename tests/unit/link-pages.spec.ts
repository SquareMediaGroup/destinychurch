import { test, expect } from "@playwright/test";
import { safeHref, safeMediaUrl, toEmbed } from "../../lib/linkPages/urls";
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  isThemeColor,
  isThemeGradient,
  parseTheme,
  readableOn,
  themeToCssVars,
} from "../../lib/linkPages/theme";
import {
  LinkBlockSchema,
  LinkPageSchema,
  LINK_BLOCK_TYPES,
  blockLabel,
  defaultBlockData,
} from "../../lib/linkPages/types";
import { isLinksPagePath } from "../../lib/linkPages/paths";
import { isEmbeddable } from "../../lib/nfcTiles";
import { previewBlocks, type EditorBlock } from "../../components/admin/links/editorTypes";
import type { PickerEvent } from "../../components/admin/EventPicker";

/**
 * The links pages put admin-typed URLs straight into hrefs, iframes and CSS
 * custom properties on a public page. These pin the rules that keep that safe,
 * and the parsing that keeps an old or half-edited page rendering.
 */

const ID = "7d3f7a52-9d0b-4c56-8a0e-7f2b9c1d4e5a";

/* ── URLs ─────────────────────────────────────────────────────────────────── */

test("safeHref allows web, mail, phone and site links", () => {
  for (const ok of ["https://x.com", "http://x.com", "mailto:a@b.co", "tel:+44123", "/baptism"]) {
    expect(safeHref(ok)).toBe(ok);
  }
});

test("safeHref refuses script URLs, protocol-relative and bare fragments", () => {
  for (const bad of ["javascript:alert(1)", " JAVASCRIPT:alert(1)", "data:text/html,x", "//evil.com", "#top", "", "ftp://x"]) {
    expect(safeHref(bad)).toBeNull();
  }
});

test("safeMediaUrl is https or a site path only", () => {
  expect(safeMediaUrl("https://cdn.x/a.webp")).toBe("https://cdn.x/a.webp");
  expect(safeMediaUrl("/img/a.png")).toBe("/img/a.png");
  expect(safeMediaUrl("http://x/a.png")).toBeNull();
  expect(safeMediaUrl("data:image/png;base64,AAA")).toBeNull();
});

test("toEmbed turns share links into player URLs", () => {
  expect(toEmbed("https://youtu.be/dQw4w9WgXcQ")?.src).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  expect(toEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3")?.kind).toBe("youtube");
  expect(toEmbed("https://vimeo.com/76979871")?.src).toBe("https://player.vimeo.com/video/76979871?dnt=1");
  expect(toEmbed("https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC")).toMatchObject({
    src: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
    height: 152,
  });
  expect(toEmbed("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")?.height).toBe(352);
  expect(toEmbed("https://www.google.com/maps/embed?pb=!1m18")?.kind).toBe("maps");
  expect(toEmbed("https://destinytees.churchsuite.com/forms/kw3c1oly")?.kind).toBe("churchsuite");
});

test("toEmbed refuses anything outside the allowlist", () => {
  for (const bad of [
    "https://evil.com/embed",
    "https://www.google.com/maps/place/x", // not an embed URL — refuses framing
    "http://open.spotify.com/track/abc",
    "dQw4w9WgXcQ", // a bare id isn't a link
    "javascript:alert(1)",
  ]) {
    expect(toEmbed(bad), bad).toBeNull();
  }
});

test("isEmbeddable matches the ChurchSuite domain, not lookalikes", () => {
  expect(isEmbeddable("https://destinytees.churchsuite.com/donate")).toBe(true);
  expect(isEmbeddable("https://notchurchsuite.com/x")).toBe(false);
  expect(isEmbeddable("http://destinytees.churchsuite.com/donate")).toBe(false);
});

/* ── Themes ───────────────────────────────────────────────────────────────── */

test("an empty theme is the Destiny Light preset", () => {
  expect(parseTheme({})).toEqual({ ...DEFAULT_THEME, preset: "destiny-light" });
  expect(parseTheme(null).button.style).toBe("fill");
});

test("every preset parses to a complete theme", () => {
  for (const preset of THEME_PRESETS) {
    expect(parseTheme(preset.theme)).toEqual(preset.theme);
  }
});

test("bad theme values fall back field by field instead of failing the page", () => {
  const theme = parseTheme({
    accent: "red; background:url(https://tracker)",
    button: { style: "neon", bg: "#123456" },
    font: { heading: "anton" },
  });
  expect(theme.accent).toBe(DEFAULT_THEME.accent);
  expect(theme.button.style).toBe("fill");
  expect(theme.button.bg).toBe("#123456");
  expect(theme.font.heading).toBe("playfair"); // Anton is homepage-only
});

test("colours and gradients are checked, url() never gets through", () => {
  expect(isThemeColor("#fff")).toBe(true);
  expect(isThemeColor("rgba(255, 255, 255, 0.5)")).toBe(true);
  expect(isThemeColor("url(x)")).toBe(false);
  expect(isThemeGradient("linear-gradient(90deg, rgba(245,128,33,1) 0%, rgba(8,87,186,1) 100%)")).toBe(true);
  expect(isThemeGradient("linear-gradient(90deg, url(https://x) 0%)")).toBe(false);
  expect(isThemeGradient("linear-gradient(red, blue); color: red")).toBe(false);
});

test("hover text is white on the accent, like /help, unless the accent is very light", () => {
  expect(readableOn("#ffffff")).toBe("#1a1a1a");
  expect(readableOn("#f58021")).toBe("#ffffff");
  expect(readableOn("#0857ba")).toBe("#ffffff");
  expect(readableOn("rgba(17,17,17,1)")).toBe("#ffffff");
});

test("themeToCssVars only emits --lp-* custom properties", () => {
  const vars = themeToCssVars(DEFAULT_THEME);
  expect(Object.keys(vars).every((k) => k.startsWith("--lp-"))).toBe(true);
});

/* ── Blocks and pages ─────────────────────────────────────────────────────── */

test("a new block of every type is flagged incomplete or valid, never a crash", () => {
  for (const type of LINK_BLOCK_TYPES) {
    const result = LinkBlockSchema.safeParse({ id: ID, type, data: defaultBlockData(type) });
    // Types with no required text start valid; the rest start as a to-do.
    const shouldPass = ["divider", "event", "form"].includes(type);
    expect(result.success, type).toBe(shouldPass);
  }
});

test("a link block refuses a script URL", () => {
  const result = LinkBlockSchema.safeParse({
    id: ID,
    type: "link",
    data: { title: "Hi", url: "javascript:alert(1)" },
  });
  expect(result.success).toBe(false);
});

test("a schedule must end after it starts", () => {
  const base = { id: ID, type: "divider", data: {} };
  expect(LinkBlockSchema.safeParse({ ...base, starts_at: "2026-10-01T10:00:00Z", ends_at: "2026-09-01T10:00:00Z" }).success).toBe(false);
  expect(LinkBlockSchema.safeParse({ ...base, starts_at: "2026-09-01T10:00:00Z", ends_at: "2026-10-01T10:00:00Z" }).success).toBe(true);
});

test("form fields need unique ids and at least one field", () => {
  const form = (fields: unknown[]) =>
    LinkBlockSchema.safeParse({ id: ID, type: "form", data: { title: "Sign up", fields } });
  expect(form([]).success).toBe(false);
  expect(
    form([
      { id: "a", kind: "name", label: "Name" },
      { id: "a", kind: "email", label: "Email" },
    ]).success,
  ).toBe(false);
  expect(form([{ id: "a", kind: "email", label: "Email", required: true }]).success).toBe(true);
});

test("page slugs are lowercase words and dashes", () => {
  const page = (slug: string) => LinkPageSchema.safeParse({ slug, theme: {} }).success;
  expect(page("youth")).toBe(true);
  expect(page("alpha-2026")).toBe(true);
  expect(page("-bad")).toBe(false);
  expect(page("has space")).toBe(false);
  expect(page("../admin")).toBe(false);
});

test("blockLabel names blocks for lists and the click log", () => {
  expect(blockLabel({ type: "link", data: { title: "Baptism" } })).toBe("Baptism");
  expect(blockLabel({ type: "event", data: { mode: "upcoming" } })).toBe("Upcoming events");
  expect(blockLabel({ type: "form", data: {} })).toBe("Form");
});

test("isLinksPagePath matches /links and its children only", () => {
  expect(isLinksPagePath("/links")).toBe(true);
  expect(isLinksPagePath("/links/youth")).toBe(true);
  expect(isLinksPagePath("/linkshare")).toBe(false);
  expect(isLinksPagePath("/admin/links")).toBe(false);
});

/* ── Editor preview ───────────────────────────────────────────────────────── */

const pickerEvent = (overrides: Partial<PickerEvent> = {}): PickerEvent => ({
  slug: "alpha",
  identifier: "abc",
  sequence: 42,
  name: "Alpha",
  start: "2026-10-01 19:00:00",
  end: "2026-10-01 21:00:00",
  endsAt: "2026-11-01T21:00:00.000Z",
  image: null,
  category: "Courses",
  location: null,
  sessionCount: 1,
  signupUrl: "https://destinytees.churchsuite.com/events/abc",
  signupEmbeddable: true,
  ...overrides,
});

test("the preview shows what the live page would: active, in-schedule, valid blocks", () => {
  const now = Date.parse("2026-09-22T12:00:00Z");
  const block = (id: string, extra: Partial<EditorBlock> = {}): EditorBlock => ({
    id,
    type: "link",
    active: true,
    starts_at: null,
    ends_at: null,
    data: { title: id, url: "/x" },
    ...extra,
  });
  const ids = (n: string) => `00000000-0000-4000-8000-00000000000${n}`;
  const result = previewBlocks(
    [
      block(ids("1")),
      block(ids("2"), { active: false }),
      block(ids("3"), { starts_at: "2026-10-01T00:00:00Z" }),
      block(ids("4"), { data: { title: "", url: "/x" } }),
      block(ids("5"), { type: "event", data: { mode: "upcoming", count: 2, category: "courses" } }),
    ],
    [pickerEvent(), pickerEvent({ slug: "other", sequence: 7, category: "Youth" })],
    now,
  );
  expect(result.map((b) => b.id)).toEqual([ids("1"), ids("5")]);
  const events = result[1].events!;
  expect(events).toHaveLength(1);
  expect(events[0].signupUrl).toBe("https://destinytees.churchsuite.com/events/abc#form_event_signup");
  expect(events[0].href).toBe("/whats-on/alpha");
});

/* ── Customisation options ────────────────────────────────────────────────── */

test("new theme options default so older saved themes look exactly as before", () => {
  const t = parseTheme({ button: { style: "outline" } });
  expect(t.button.size).toBe("normal");
  expect(t.button.spacing).toBe("normal");
  expect(t.button.borderWidth).toBe(1);
  expect(t.button.showIcons).toBe(true);
  expect(t.layout.width).toBe("normal");
  expect(t.layout.showFooter).toBe(true);
  expect(t.profile).toEqual({ align: "center", titleSize: "lg", uppercase: false, showRule: true });
  expect(t.socials).toEqual({ style: "plain", size: "md" });
  expect(t.background.pattern).toBe("none");
});

test("custom corner radius is clamped and emitted in px", () => {
  const vars = themeToCssVars(parseTheme({ button: { radius: "custom", radiusPx: 12 } }));
  expect(vars["--lp-radius"]).toBe("12px");
  expect(parseTheme({ button: { radiusPx: 400 } }).button.radiusPx).toBe(18);
});

test("per-button colour overrides accept colours or blank, never CSS", () => {
  const link = (data: Record<string, unknown>) =>
    LinkBlockSchema.safeParse({ id: ID, type: "link", data: { title: "Hi", url: "/x", ...data } }).success;
  expect(link({ bg: "#0857ba", color: "rgba(255,255,255,1)" })).toBe(true);
  expect(link({ bg: "" })).toBe(true);
  expect(link({ bg: "red; background:url(https://x)" })).toBe(false);
  expect(link({ align: "center", hideIcon: true })).toBe(true);
});
