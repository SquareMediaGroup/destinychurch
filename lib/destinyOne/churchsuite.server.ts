// Destiny One — ChurchSuite API v2 client (the network half; the pure mapping
// lives in churchsuite.ts).
//
// Two credentials, both server-side only:
//
//   CHURCHSUITE_CLIENT_ID / CHURCHSUITE_CLIENT_SECRET
//     An OAuth app using client credentials — the BFF's own access for looking
//     people up in the Address Book and Children modules. Scopes needed:
//     addressbook.read children.read (docs/mobile-app-scope.md A.3).
//
//   CHURCHSUITE_OAUTH_CLIENT_ID / CHURCHSUITE_OAUTH_CLIENT_SECRET
//     The OAuth app behind "Sign in with ChurchSuite" (authorisation code +
//     PKCE, scope `user`). Falls back to the pair above when unset. NOTE: this
//     identifies ChurchSuite *users* — staff and leaders with a ChurchSuite
//     login — not every member. Everyone else signs in with email.
//
// The app never talks to ChurchSuite directly.
//
// Outage behaviour (§5.3): every function throws ChurchSuiteUnavailable rather
// than returning "not found" when ChurchSuite can't be reached, so callers can
// treat an outage as "no change" instead of "this person is gone".

import "server-only";
import { toPerson, type CsPerson } from "@/lib/destinyOne/churchsuite";

const API = "https://api.churchsuite.com/v2";
export const CHURCHSUITE_AUTHORIZE_URL = "https://login.churchsuite.com/oauth2/authorize";
const TOKEN_URL = "https://login.churchsuite.com/oauth2/token";
const TIMEOUT_MS = 8000;

export class ChurchSuiteUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChurchSuiteUnavailable";
  }
}

export function churchSuiteConfigured(): boolean {
  return Boolean(process.env.CHURCHSUITE_CLIENT_ID && process.env.CHURCHSUITE_CLIENT_SECRET);
}

export function oauthClient(): { id: string; secret: string } | null {
  const id = process.env.CHURCHSUITE_OAUTH_CLIENT_ID || process.env.CHURCHSUITE_CLIENT_ID;
  const secret = process.env.CHURCHSUITE_OAUTH_CLIENT_SECRET || process.env.CHURCHSUITE_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

async function post(url: string, form: Record<string, string>): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams(form),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    throw new ChurchSuiteUnavailable(`ChurchSuite token request failed: ${String(err)}`);
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // 4xx on the token endpoint is a bad code/credential, not an outage.
    if (res.status >= 400 && res.status < 500) {
      throw new Error(`ChurchSuite rejected the token request (${res.status}): ${String(json.error ?? "")}`);
    }
    throw new ChurchSuiteUnavailable(`ChurchSuite token endpoint returned ${res.status}`);
  }
  return json;
}

// ── App credential (client credentials) ─────────────────────────────────────

let cached: { token: string; expiresAt: number } | null = null;

async function appToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const id = process.env.CHURCHSUITE_CLIENT_ID;
  const secret = process.env.CHURCHSUITE_CLIENT_SECRET;
  if (!id || !secret) throw new ChurchSuiteUnavailable("ChurchSuite API credentials are not configured.");

  const json = await post(TOKEN_URL, {
    grant_type: "client_credentials",
    client_id: id,
    client_secret: secret,
    scope: process.env.CHURCHSUITE_SCOPES || "addressbook.read children.read",
  });
  const token = typeof json.access_token === "string" ? json.access_token : null;
  if (!token) throw new ChurchSuiteUnavailable("ChurchSuite returned no access token.");
  const ttl = typeof json.expires_in === "number" ? json.expires_in : 3600;
  cached = { token, expiresAt: Date.now() + ttl * 1000 };
  return token;
}

async function get(path: string, params: Record<string, string> = {}, bearer?: string): Promise<unknown> {
  const token = bearer ?? (await appToken());
  const url = `${API}${path}${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    throw new ChurchSuiteUnavailable(`ChurchSuite request failed: ${String(err)}`);
  }
  if (res.status === 404) return null;
  if (res.status === 401 && !bearer) cached = null;
  if (!res.ok) throw new ChurchSuiteUnavailable(`ChurchSuite ${path} returned ${res.status}`);
  return res.json().catch(() => null);
}

function dataArray(json: unknown): unknown[] {
  const data = (json as { data?: unknown } | null)?.data;
  return Array.isArray(data) ? data : [];
}

function dataObject(json: unknown): unknown {
  return (json as { data?: unknown } | null)?.data ?? null;
}

// ── Lookups ─────────────────────────────────────────────────────────────────

/**
 * Everyone in Address Book and Children whose record fuzzy-matches the email.
 * The caller does the exact match (pickByEmail) — `q` also matches names etc.
 */
export async function findPeopleByEmail(email: string): Promise<CsPerson[]> {
  const params = { q: email, status: "active", per_page: "25" };
  const [contacts, children] = await Promise.all([
    get("/addressbook/contacts", params),
    get("/children/children", params),
  ]);
  return [
    ...dataArray(contacts).map((r) => toPerson(r, "contact")),
    ...dataArray(children).map((r) => toPerson(r, "child")),
  ].filter((p): p is CsPerson => p !== null);
}

export async function getContact(id: number): Promise<CsPerson | null> {
  return toPerson(dataObject(await get(`/addressbook/contacts/${id}`)), "contact");
}

export async function getChild(id: number): Promise<CsPerson | null> {
  return toPerson(dataObject(await get(`/children/children/${id}`)), "child");
}

// ── Sign in with ChurchSuite ────────────────────────────────────────────────

export async function exchangeAuthCode(input: {
  code: string;
  verifier: string;
  redirectUri: string;
}): Promise<string> {
  const client = oauthClient();
  if (!client) throw new ChurchSuiteUnavailable("Sign in with ChurchSuite is not configured.");
  const json = await post(TOKEN_URL, {
    grant_type: "authorization_code",
    code: input.code,
    redirect_uri: input.redirectUri,
    code_verifier: input.verifier,
    client_id: client.id,
    client_secret: client.secret,
  });
  const token = typeof json.access_token === "string" ? json.access_token : null;
  if (!token) throw new Error("ChurchSuite returned no access token.");
  return token;
}

export interface CsCurrentUser {
  userId: number;
  contactId: number | null;
  email: string | null;
  name: string | null;
}

/** GET /account/users/current with the signed-in user's token (scope `user`). */
export async function getCurrentUser(userToken: string): Promise<CsCurrentUser | null> {
  const r = dataObject(await get("/account/users/current", {}, userToken)) as Record<string, unknown> | null;
  if (!r) return null;
  const userId = Number(r.id);
  if (!Number.isSafeInteger(userId)) return null;
  const contactId = Number(r.contact_id);
  return {
    userId,
    contactId: Number.isSafeInteger(contactId) && contactId > 0 ? contactId : null,
    email: typeof r.email === "string" ? r.email.trim().toLowerCase() : null,
    name: typeof r.name === "string" ? r.name.trim() : null,
  };
}
