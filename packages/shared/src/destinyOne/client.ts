// Destiny One — typed client for /api/app/v1/one/*.
//
// Framework-free (only `fetch`), so the Expo app uses it directly and tests can
// hand it a stub. Every method returns the envelope's `data` or throws a
// D1ApiError carrying the server's stable error code.

import type {
  D1AppConfig,
  D1CommunitySummary,
  D1Consent,
  D1DirectoryEntry,
  D1Envelope,
  D1AccessRequest,
  D1ErrorBody,
  D1ErrorCode,
  D1EventRef,
  D1EventSummary,
  D1Export,
  D1FeedbackInput,
  D1GroupDetail,
  D1Me,
  D1MembershipRole,
  D1Message,
  D1MessageHit,
  D1MessagePage,
  D1PollDraft,
  D1UploadTicket,
} from "./types";

export class D1ApiError extends Error {
  constructor(
    readonly code: D1ErrorCode | "network",
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "D1ApiError";
  }
}

export interface DestinyOneClientOptions {
  /** Site origin, e.g. https://destinytees.uk — no trailing slash needed. */
  baseUrl: string;
  /** The current Supabase access token, or null when signed out. */
  getAccessToken: () => Promise<string | null> | string | null;
  fetchImpl?: typeof fetch;
}

function xhrSend(method: string, url: string, headers: Record<string, string>, body: FormData) {
  return new Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.timeout = 60_000;
    xhr.onload = () =>
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: async () => JSON.parse(xhr.responseText),
      });
    xhr.onerror = () => reject(new Error("Network request failed"));
    xhr.ontimeout = () => reject(new Error("Network request timed out"));
    xhr.send(body);
  });
}

export function createDestinyOneClient({ baseUrl, getAccessToken, fetchImpl }: DestinyOneClientOptions) {
  const root = `${baseUrl.replace(/\/$/, "")}/api/app/v1/one`;
  const doFetch = fetchImpl ?? fetch;

  async function call<T>(method: string, path: string, body?: unknown, opts: { anonymous?: boolean } = {}): Promise<T> {
    const token = opts.anonymous ? null : await getAccessToken();
    let res: Response;
    try {
      res = await doFetch(`${root}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new D1ApiError("network", err instanceof Error ? err.message : "Network error", 0);
    }

    const json = (await res.json().catch(() => null)) as D1Envelope<T> | D1ErrorBody | null;
    if (!res.ok || !json || "error" in json) {
      const error = json && "error" in json ? json.error : null;
      throw new D1ApiError(
        error?.code ?? "unavailable",
        error?.message ?? "Something went wrong. Please try again.",
        res.status,
      );
    }
    return json.data;
  }

  /** Like `call`, but sends `file` as multipart/form-data instead of JSON. */
  async function callForm<T>(method: string, path: string, file: Blob): Promise<T> {
    const token = await getAccessToken();
    const body = new FormData();
    body.append("file", file);

    // React Native's file part ({ uri, name, type }) is refused by Expo's fetch
    // ("unsupported form data per implementation"), which used to surface as a
    // bogus "you're offline". XMLHttpRequest streams it from disk natively.
    const isNativeFilePart = typeof (file as unknown as { uri?: unknown }).uri === "string" && !(file instanceof Blob);
    let res: { ok: boolean; status: number; json: () => Promise<unknown> };
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      res =
        isNativeFilePart && typeof XMLHttpRequest !== "undefined"
          ? await xhrSend(method, `${root}${path}`, headers, body)
          : await doFetch(`${root}${path}`, { method, headers, body });
    } catch (err) {
      throw new D1ApiError("network", err instanceof Error ? err.message : "Network error", 0);
    }

    const json = (await res.json().catch(() => null)) as D1Envelope<T> | D1ErrorBody | null;
    if (!res.ok || !json || "error" in json) {
      const error = json && "error" in json ? json.error : null;
      throw new D1ApiError(
        error?.code ?? "unavailable",
        error?.message ?? "Something went wrong. Please try again.",
        res.status,
      );
    }
    return json.data;
  }

  const q = (params: Record<string, string | number | undefined>) => {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][];
    return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
  };

  return {
    // ── App ──
    /** Minimum builds, maintenance switch. Sent without a token so it works signed out and the CDN can cache it. */
    appConfig: () => call<D1AppConfig>("GET", "/config", undefined, { anonymous: true }),

    // ── Account ──
    /** Links the signed-in account to its ChurchSuite record. Call after every sign-in. */
    link: () => call<D1Me>("POST", "/auth/link"),
    /**
     * Ask for an email sign-in code. The server sends one only if this email can get in, and always
     * answers the same, so it never reveals who is a member. Then verify with Supabase `verifyOtp`.
     */
    requestCode: (email: string) => call<{ sent: true }>("POST", "/auth/code", { email }, { anonymous: true }),
    /** Where to open the ChurchSuite sign-in (in an auth session browser). */
    churchSuiteStartUrl: (redirect: string, challenge: string) =>
      `${root}/auth/churchsuite/start${q({ redirect, challenge })}`,
    /** Swap the one-time code from the ChurchSuite redirect for a Supabase token hash. */
    exchangeChurchSuiteCode: (code: string, verifier: string) =>
      call<{ tokenHash: string; type: "magiclink" }>("POST", "/auth/churchsuite/exchange", { code, verifier }),
    me: () => call<D1Me>("GET", "/me"),
    /** Change my own name. */
    updateName: (firstName: string, lastName: string) => call<D1Me>("PATCH", "/me", { firstName, lastName }),
    /** For `onboarding: "request_needed"` — ask the church team for access. */
    requestAccess: (input: D1AccessRequest) => call<D1Me>("POST", "/me/access-request", input),
    acceptConsents: (consents: D1Consent[]) => call<D1Me>("POST", "/me/consents", { consents }),
    exportMyData: () => call<D1Export>("GET", "/me/export"),
    /** Change my sign-in email, step 1: emails a code to the new address. Send the ticket back with it. */
    startEmailChange: (email: string) => call<{ ticket: string }>("POST", "/me/email", { email }),
    /** Step 2: the code from that email. Refresh the Supabase session afterwards to pick up the new address. */
    confirmEmailChange: (ticket: string, code: string) => call<{ email: string }>("POST", "/me/email/confirm", { ticket, code }),
    /** Whether I already have a password (decides if changing it needs the current one). */
    hasPassword: () => call<{ hasPassword: boolean }>("GET", "/me/password"),
    /** Set or change my password. `current` is required when I already have one. */
    changePassword: (password: string, current?: string) => call<{ ok: true }>("POST", "/me/password", { password, current }),
    /** "Report a problem" and "Send feedback". Goes to the Destiny One Admins, not the safeguarding team. */
    sendFeedback: (input: D1FeedbackInput) => call<{ ok: true }>("POST", "/feedback", input),
    deleteAccount: () => call<{ deleted: true }>("DELETE", "/me", { confirm: "DELETE" }),
    registerPushToken: (token: string, platform: "ios" | "android") =>
      call<{ ok: true }>("POST", "/me/push-tokens", { token, platform }),
    unregisterPushToken: (token: string) => call<{ ok: true }>("DELETE", "/me/push-tokens", { token }),
    /** Upload/replace my profile picture. `file` is a multipart form part (React Native's `{ uri, name, type }` shape works). */
    uploadAvatar: (file: Blob) => callForm<D1Me>("POST", "/me/avatar", file),
    removeAvatar: () => call<D1Me>("DELETE", "/me/avatar"),
    /** Hide someone's messages and notifications for me. They stay in every group; safeguarding can still see everything. */
    block: (memberId: string) => call<D1Me>("POST", `/members/${memberId}/block`),
    unblock: (memberId: string) => call<D1Me>("DELETE", `/members/${memberId}/block`),

    // ── Communities ──
    communities: () => call<D1CommunitySummary[]>("GET", "/communities"),
    community: (id: string) => call<D1CommunitySummary>("GET", `/communities/${id}`),
    createCommunity: (input: { name: string; description?: string }) =>
      call<D1CommunitySummary>("POST", "/communities", input),
    addCommunityMembers: (id: string, memberIds: string[], role: D1MembershipRole = "member") =>
      call<{ ok: true }>("POST", `/communities/${id}/members`, { memberIds, role }),
    removeCommunityMember: (id: string, memberId: string) =>
      call<{ ok: true }>("DELETE", `/communities/${id}/members`, { memberId }),
    leaveCommunity: (id: string) => call<{ ok: true }>("DELETE", `/communities/${id}/members`, {}),
    createGroup: (
      communityId: string,
      input: { name: string; department?: string; description?: string; memberIds: string[] },
    ) => call<D1GroupDetail>("POST", `/communities/${communityId}/groups`, input),

    // ── Groups ──
    group: (id: string) => call<D1GroupDetail>("GET", `/groups/${id}`),
    /** Set/replace a group's icon. Any member can; `file` is a multipart form part like `uploadAvatar`. */
    uploadGroupIcon: (id: string, file: Blob) => callForm<D1GroupDetail>("POST", `/groups/${id}/icon`, file),
    removeGroupIcon: (id: string) => call<D1GroupDetail>("DELETE", `/groups/${id}/icon`),
    updateGroup: (id: string, input: { name?: string; department?: string | null; description?: string | null; archived?: boolean }) =>
      call<D1GroupDetail>("PATCH", `/groups/${id}`, input),
    addGroupMembers: (id: string, memberIds: string[], role: D1MembershipRole = "member") =>
      call<{ ok: true }>("POST", `/groups/${id}/members`, { memberIds, role }),
    removeGroupMember: (id: string, memberId: string) =>
      call<{ ok: true }>("DELETE", `/groups/${id}/members`, { memberId }),
    leaveGroup: (id: string) => call<{ ok: true }>("DELETE", `/groups/${id}/members`, {}),
    /** Leaders: invite someone new by email. Staff confirm them before they join. */
    inviteToGroup: (id: string, input: { email: string; name: string; adult: boolean; note?: string }) =>
      call<{ ok: true }>("POST", `/groups/${id}/invites`, input),
    mute: (id: string, until: string | null) => call<{ ok: true }>("POST", `/groups/${id}/mute`, { until }),
    markRead: (id: string, messageId: number) => call<{ ok: true }>("POST", `/groups/${id}/read`, { messageId }),

    // ── Messages ──
    messages: (groupId: string, opts: { before?: number; limit?: number } = {}) =>
      call<D1MessagePage>("GET", `/groups/${groupId}/messages${q(opts)}`),
    send: (groupId: string, input: { body?: string; replyTo?: number; attachmentId?: string; poll?: D1PollDraft; event?: D1EventRef }) =>
      call<D1Message>("POST", `/groups/${groupId}/messages`, input),
    deleteMessage: (messageId: number) => call<{ ok: true }>("DELETE", `/messages/${messageId}`),
    report: (messageId: number, reason: string) =>
      call<{ ok: true }>("POST", `/messages/${messageId}/report`, { reason }),
    react: (messageId: number, emoji: string) =>
      call<{ ok: true }>("POST", `/messages/${messageId}/reactions`, { emoji }),
    unreact: (messageId: number, emoji: string) =>
      call<{ ok: true }>("DELETE", `/messages/${messageId}/reactions`, { emoji }),
    /** Cast (or clear, with an empty array) this member's vote(s) on a poll message. */
    vote: (messageId: number, optionIds: string[]) =>
      call<{ ok: true }>("POST", `/messages/${messageId}/vote`, { optionIds }),
    /** Fresh links for cached attachments whose signed URLs have expired (links last an hour). */
    attachmentUrls: (groupId: string, attachmentIds: string[]) =>
      call<{ urls: { id: string; url: string | null }[] }>("GET", `/groups/${groupId}/attachments${q({ ids: attachmentIds.join(",") })}`),
    requestUpload: (groupId: string, input: { mimeType: string; sizeBytes: number }) =>
      call<D1UploadTicket>("POST", `/groups/${groupId}/attachments`, input),

    /** Search your messages (groups you're in, since you joined; never deleted ones). */
    searchMessages: (query: string) => call<D1MessageHit[]>("GET", `/search/messages${q({ q: query })}`),

    /** Upcoming ChurchSuite events, for the Event attach picker. */
    events: () => call<D1EventSummary[]>("GET", "/events"),

    // ── Directory (leaders) ──
    directory: (query: string, communityId?: string) =>
      call<D1DirectoryEntry[]>("GET", `/directory${q({ q: query, communityId })}`),
  };
}

export type DestinyOneClient = ReturnType<typeof createDestinyOneClient>;
