import { test, expect } from "@playwright/test";
import {
  challengeFor,
  createPkcePair,
  isAllowedAppRedirect,
  pickByEmail,
  seal,
  toPerson,
  unseal,
  verifierMatches,
  type CsPerson,
} from "../../lib/destinyOne/churchsuite";

/**
 * The pure half of Destiny One's ChurchSuite integration.
 *
 * The first block is the important one: data minimisation is enforced by
 * toPerson()'s allow-list. If a ChurchSuite record's phone numbers, address,
 * medical notes or full date of birth ever make it through, the app's
 * "no phone numbers" safeguarding rule is broken at the source.
 */

const rawContact = {
  id: 42,
  first_name: "Charlotte",
  last_name: "MacDonald",
  formal_name: "Mrs Charlotte MacDonald",
  date_of_birth: "1990-05-17",
  email: "Charlotte@Example.org",
  mobile: "07700 900123",
  telephone: "01642 000000",
  work_telephone: "01642 111111",
  address: { line1: "1 High Street", postcode: "TS1 1AA" },
  spouse_id: 7,
  custom_fields: { shoe_size: 6 },
  communication: { sms: true },
  status: "active",
};

const rawChild = {
  id: 9,
  first_name: "Sam",
  last_name: "Jones",
  date_of_birth: "2015-03-02",
  email: "family@example.org",
  mobile: "07700 900456",
  medical: "Asthma",
  additional_needs: "Needs a quiet space",
  status: "active",
};

test.describe("toPerson keeps only what Destiny One needs", () => {
  test("a contact keeps name, email, status and the 18th birthday — nothing else", () => {
    const person = toPerson(rawContact, "contact");
    expect(person).toEqual({
      kind: "contact",
      id: 42,
      displayName: "Charlotte MacDonald",
      email: "charlotte@example.org",
      adultOn: "2008-05-17",
      status: "active",
    });
  });

  test("no phone, address, medical or date of birth survives, under any key", () => {
    for (const [raw, kind] of [
      [rawContact, "contact"],
      [rawChild, "child"],
    ] as const) {
      const json = JSON.stringify(toPerson(raw, kind));
      for (const leaked of ["07700", "01642", "High Street", "Asthma", "quiet space", "1990-05-17", "2015-03-02", "shoe"]) {
        expect(json, `${kind} leaked "${leaked}"`).not.toContain(leaked);
      }
    }
  });

  test("a Children-module record is always a minor, whatever its date of birth", () => {
    expect(toPerson({ ...rawChild, date_of_birth: "1990-01-01" }, "child")?.adultOn).toBeNull();
  });

  test("a contact with no date of birth is a minor (fail safe)", () => {
    expect(toPerson({ ...rawContact, date_of_birth: null }, "contact")?.adultOn).toBeNull();
  });

  test("records without an id or a name are dropped", () => {
    expect(toPerson({ ...rawContact, id: undefined }, "contact")).toBeNull();
    expect(toPerson({ ...rawContact, first_name: "", last_name: "", formal_name: "" }, "contact")).toBeNull();
    expect(toPerson(null, "contact")).toBeNull();
  });
});

test.describe("pickByEmail", () => {
  const p = (over: Partial<CsPerson>): CsPerson => ({
    kind: "contact",
    id: 1,
    displayName: "A",
    email: "a@example.org",
    adultOn: null,
    status: "active",
    ...over,
  });

  test("exactly one active exact match links", () => {
    const out = pickByEmail([p({ id: 1 }), p({ id: 2, email: "b@example.org" })], "A@Example.org ");
    expect(out).toMatchObject({ kind: "match", person: { id: 1 } });
  });

  test("a shared family email is ambiguous, not a guess", () => {
    const out = pickByEmail([p({ id: 1 }), p({ id: 2, kind: "child" })], "a@example.org");
    expect(out).toEqual({ kind: "ambiguous", count: 2 });
  });

  test("fuzzy near-misses and archived records don't count", () => {
    expect(pickByEmail([p({ email: "aa@example.org" }), p({ status: "archived" })], "a@example.org")).toEqual({
      kind: "none",
    });
  });
});

test.describe("sign-in hand-off", () => {
  const secret = "test-secret-at-least-32-characters-long";

  test("seal/unseal round-trips", () => {
    const token = seal({ tokenHash: "abc", appChallenge: "xyz" }, secret, 60);
    expect(unseal(token, secret)).toMatchObject({ tokenHash: "abc", appChallenge: "xyz" });
  });

  test("a different secret, a tampered token or an expired one is rejected", () => {
    const token = seal({ tokenHash: "abc" }, secret, 60);
    expect(unseal(token, "another-secret-entirely-000000000000")).toBeNull();
    expect(unseal(token.slice(0, -2) + (token.endsWith("A") ? "BB" : "AA"), secret)).toBeNull();
    expect(unseal(seal({ tokenHash: "abc" }, secret, -1), secret)).toBeNull();
    expect(unseal("garbage", secret)).toBeNull();
  });

  test("the sealed payload isn't readable", () => {
    const token = seal({ tokenHash: "super-secret-hash" }, secret, 60);
    expect(Buffer.from(token, "base64").toString("utf8")).not.toContain("super-secret-hash");
  });

  test("PKCE: only the right verifier matches its challenge", () => {
    const { verifier, challenge } = createPkcePair();
    expect(challenge).toBe(challengeFor(verifier));
    expect(verifierMatches(verifier, challenge)).toBe(true);
    expect(verifierMatches(createPkcePair().verifier, challenge)).toBe(false);
  });

  test("redirects: only the app's own scheme, exp:// only in development", () => {
    expect(isAllowedAppRedirect("destinyone://auth")).toBe(true);
    expect(isAllowedAppRedirect("https://evil.example/cb")).toBe(false);
    expect(isAllowedAppRedirect("destinyone://auth?x=https://evil")).toBe(false);
    expect(isAllowedAppRedirect("exp://192.168.1.5:8081/--/auth")).toBe(false);
    expect(isAllowedAppRedirect("exp://192.168.1.5:8081/--/auth", true)).toBe(true);
  });
});
