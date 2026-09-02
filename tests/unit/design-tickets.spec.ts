import { test, expect } from "@playwright/test";
import {
  DESIGN_STATUSES,
  DESIGN_STATUS_BLURB,
  DESIGN_STATUS_LABELS,
  DESIGN_STATUS_ORDER,
  DESIGN_STATUS_TONE,
  OPEN_STATUSES,
  TERMINAL_STATUSES,
  canTransition,
  fileSize,
  nextStatuses,
  ticketRef,
  transitionLabel,
  uniqueEmails,
  type DesignTicketStatus,
} from "../../lib/designTickets";

/**
 * canTransition is the workflow. It is checked twice — once by the UI to decide
 * which buttons exist, and once by applyTransition to decide whether to honour
 * a POST — and only the second one is a guarantee. These pin the shape of the
 * rules so a change to them has to be deliberate.
 */

/* ── The happy path ────────────────────────────────────────────────────────── */

test("a ticket can go all the way from open to closed", () => {
  const journey: [DesignTicketStatus, DesignTicketStatus, "designer" | "requester"][] = [
    ["open", "claimed", "designer"],
    ["claimed", "in_progress", "designer"],
    ["in_progress", "delivered", "designer"],
    ["delivered", "closed", "requester"],
  ];
  for (const [from, to, actor] of journey) {
    expect(canTransition(from, to, actor), `${from} → ${to} as ${actor}`).toBe(true);
  }
});

test("a delivered ticket can go back round for changes and be delivered again", () => {
  expect(canTransition("delivered", "changes_requested", "requester")).toBe(true);
  expect(canTransition("changes_requested", "in_progress", "designer")).toBe(true);
  expect(canTransition("in_progress", "delivered", "designer")).toBe(true);
});

test("a claimed ticket can be put back without being cancelled", () => {
  // Someone picks up a ticket, realises it isn't theirs, and needs a way out
  // that isn't "cancel the whole request".
  expect(canTransition("claimed", "open", "designer")).toBe(true);
});

/* ── What a requester must not be able to do ───────────────────────────────── */

test("a requester cannot do a designer's job", () => {
  const forbidden: [DesignTicketStatus, DesignTicketStatus][] = [
    ["open", "claimed"],
    ["claimed", "in_progress"],
    ["in_progress", "delivered"],
    ["changes_requested", "in_progress"],
    ["claimed", "open"],
  ];
  for (const [from, to] of forbidden) {
    expect(canTransition(from, to, "requester"), `${from} → ${to}`).toBe(false);
  }
});

test("a requester cannot mark their own request delivered", () => {
  // The one that would matter most: it would send a "your files are ready"
  // email for a ticket with no files.
  for (const from of DESIGN_STATUSES) {
    expect(canTransition(from, "delivered", "requester"), from).toBe(false);
  }
});

test("nobody can skip claiming a ticket before working on it", () => {
  expect(canTransition("open", "in_progress", "designer")).toBe(false);
  expect(canTransition("open", "delivered", "designer")).toBe(false);
});

/* ── Terminal states ───────────────────────────────────────────────────────── */

test("closed and cancelled are the end of the line for everyone", () => {
  for (const terminal of TERMINAL_STATUSES) {
    for (const to of DESIGN_STATUSES) {
      for (const actor of ["designer", "requester"] as const) {
        expect(canTransition(terminal, to, actor), `${terminal} → ${to} as ${actor}`).toBe(false);
      }
    }
    expect(nextStatuses(terminal, "designer")).toEqual([]);
    expect(nextStatuses(terminal, "requester")).toEqual([]);
  }
});

test("anything still live can be cancelled by either side", () => {
  for (const from of DESIGN_STATUSES) {
    if (TERMINAL_STATUSES.includes(from)) continue;
    expect(canTransition(from, "cancelled", "designer"), from).toBe(true);
    expect(canTransition(from, "cancelled", "requester"), from).toBe(true);
  }
});

test("a ticket never transitions to itself", () => {
  for (const status of DESIGN_STATUSES) {
    expect(canTransition(status, status, "designer"), status).toBe(false);
    expect(canTransition(status, status, "requester"), status).toBe(false);
  }
});

/* ── Registry integrity ────────────────────────────────────────────────────── */

test("every status has a label, a tone and a sentence for the requester", () => {
  for (const status of DESIGN_STATUSES) {
    expect(DESIGN_STATUS_LABELS[status], status).toBeTruthy();
    expect(DESIGN_STATUS_TONE[status], status).toBeTruthy();
    // The admin labels are shorthand for people who live in the queue. Someone
    // who filed one request three weeks ago needs the sentence.
    expect(DESIGN_STATUS_BLURB[status], status).toBeTruthy();
  }
});

test("the queue's status ordering covers every status exactly once", () => {
  expect(new Set(DESIGN_STATUS_ORDER)).toEqual(new Set(DESIGN_STATUSES));
  expect(DESIGN_STATUS_ORDER.length).toBe(DESIGN_STATUSES.length);
});

test("the 'needs someone' view is every non-terminal status", () => {
  const live = DESIGN_STATUSES.filter((s) => !TERMINAL_STATUSES.includes(s));
  expect(new Set(OPEN_STATUSES)).toEqual(new Set(live));
});

test("every move a designer can make has button text that isn't just a status name", () => {
  // "Claim this" and "Start work" say what happens; "Claimed" and "In progress"
  // are what the ticket becomes. A button labelled with the latter reads wrong.
  for (const from of DESIGN_STATUSES) {
    for (const to of nextStatuses(from, "designer")) {
      expect(transitionLabel(from, to), `${from} → ${to}`).toBeTruthy();
    }
  }
  expect(transitionLabel("open", "claimed")).toBe("Claim this");
  expect(transitionLabel("in_progress", "delivered")).toBe("Mark delivered");
});

/* ── Display ───────────────────────────────────────────────────────────────── */

test("a ticket reference is readable out loud and sorts as text", () => {
  expect(ticketRef(1)).toBe("DT-0001");
  expect(ticketRef(42)).toBe("DT-0042");
  expect(ticketRef(9999)).toBe("DT-9999");
  // Past the padding it keeps going rather than truncating.
  expect(ticketRef(10000)).toBe("DT-10000");
});

test("file sizes read as sizes", () => {
  expect(fileSize(null)).toBe("");
  expect(fileSize(0)).toBe("");
  expect(fileSize(512)).toBe("512 B");
  expect(fileSize(2048)).toBe("2 KB");
  expect(fileSize(5 * 1024 * 1024)).toBe("5.0 MB");
  expect(fileSize(3 * 1024 * 1024 * 1024)).toBe("3.00 GB");
});

/* ── Notification recipients ───────────────────────────────────────────────── */

/**
 * Team notifications are addressed by role — design_admin or super_admin — and
 * one person can hold both. Without the case-insensitive dedupe they'd get two
 * copies of every request, and the assignee on a change request would get a
 * third.
 */

test("someone holding both roles is one recipient, not two", () => {
  expect(uniqueEmails(["jo@destinytees.uk", "jo@destinytees.uk"])).toEqual([
    "jo@destinytees.uk",
  ]);
});

test("the same inbox typed with different capitals is still one recipient", () => {
  // Addresses are typed by hand on /admin/users, so this is the realistic case.
  expect(uniqueEmails(["Jo@destinytees.uk", "jo@destinytees.uk"])).toEqual([
    "Jo@destinytees.uk",
  ]);
});

test("the first spelling seen is the one kept", () => {
  expect(uniqueEmails(["JO@destinytees.uk", "jo@destinytees.uk"])[0]).toBe(
    "JO@destinytees.uk",
  );
});

test("blank, whitespace and missing addresses are dropped, not mailed", () => {
  // admin_roles.email is nullable, and a row with no address must not become
  // an empty recipient that makes Resend reject the whole send.
  expect(uniqueEmails(["a@x.uk", "", "   ", null, undefined, "b@x.uk"])).toEqual([
    "a@x.uk",
    "b@x.uk",
  ]);
});

test("addresses are trimmed", () => {
  expect(uniqueEmails(["  jo@destinytees.uk  "])).toEqual(["jo@destinytees.uk"]);
  // ...and a trimmed duplicate still collapses.
  expect(uniqueEmails(["jo@destinytees.uk", " jo@destinytees.uk "])).toHaveLength(1);
});

test("order is preserved so the list reads predictably", () => {
  expect(uniqueEmails(["c@x.uk", "a@x.uk", "b@x.uk"])).toEqual([
    "c@x.uk",
    "a@x.uk",
    "b@x.uk",
  ]);
});

test("nobody in, nobody out — the caller's cue to use the fallback inbox", () => {
  expect(uniqueEmails([])).toEqual([]);
  expect(uniqueEmails([null, "", undefined])).toEqual([]);
});
