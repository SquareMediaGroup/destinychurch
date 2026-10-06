// Destiny One — link previews, the fetching half.
//
// After a message with a link is sent (or edited), the API fetches that page
// once and keeps a small preview (title, description, site, picture link)
// beside the message, sealed like the text. Members' phones never contact the
// site to build it, so a link doesn't tell the site who's in the chat; only
// the preview picture, if any, is loaded by the phone, over https.
//
// The fetch runs on our server, so it's locked down against being pointed at
// anything internal (SSRF): http(s) on the standard ports only, and every
// connection, including after a redirect, must resolve to a public address.
// The check runs inside the connection's own DNS lookup, so a hostname can't
// pass the check and then resolve somewhere else when connecting. A link to a
// bare IP address never does a lookup, so that's checked before connecting. Only HTML,
// at most 512 KB, 5 seconds, 3 redirects.

import "server-only";
import http from "node:http";
import https from "node:https";
import dns from "node:dns";
import { isIP, type LookupFunction } from "node:net";
import type { D1LinkPreview } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { firstUrl, isPublicAddress, parsePreview } from "@/lib/destinyOne/linkPreview";
import { sealBody } from "@/lib/destinyOne/crypto.server";
import { broadcastToGroup } from "@/lib/destinyOne/chat.server";

const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

class BlockedAddressError extends Error {}

/** DNS lookup that refuses any address that isn't on the public internet. */
const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    const bad = list.find((a) => !isPublicAddress(a.address));
    if (!list.length || bad) return callback(new BlockedAddressError(`Refused to connect to ${bad?.address ?? hostname}`), "", 4);
    if ((options as dns.LookupOptions).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list);
    callback(null, list[0].address, list[0].family);
  });
};

function getOnce(url: URL): Promise<{ status: number; location?: string; contentType: string; body: string }> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        lookup: publicOnlyLookup,
        timeout: TIMEOUT_MS,
        headers: {
          "User-Agent": "DestinyOne-LinkPreview/1.0 (+https://destinytees.uk)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-GB,en;q=0.8",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "");
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location, contentType, body: "" });
        }
        if (!/text\/html|application\/xhtml/i.test(contentType)) {
          res.destroy();
          return resolve({ status, contentType, body: "" });
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            res.destroy();
            return;
          }
          chunks.push(chunk);
        });
        res.on("close", () => resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new Error("Link preview timed out")));
    req.on("error", reject);
    req.end();
  });
}

/** The preview for one link, or null if there isn't a usable one. Never throws. */
export async function fetchLinkPreview(link: string): Promise<D1LinkPreview | null> {
  try {
    let url = new URL(link);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (url.protocol !== "https:" && url.protocol !== "http:") return null;
      if (url.port && url.port !== "443" && url.port !== "80") return null;
      // A bare IP address skips DNS, so the lookup check never runs: check it here.
      const host = url.hostname.replace(/^\[|\]$/g, "");
      if (isIP(host) && !isPublicAddress(host)) throw new BlockedAddressError(`Refused to connect to ${host}`);
      const res = await getOnce(url);
      if (res.location && res.status >= 300 && res.status < 400) {
        url = new URL(res.location, url);
        continue;
      }
      if (res.status !== 200 || !res.body) return null;
      return parsePreview(res.body, url.toString());
    }
    return null;
  } catch (err) {
    if (!(err instanceof BlockedAddressError)) console.log(`🔗 No link preview for a message link: ${(err as Error).message}`);
    else console.warn(`🛑 Link preview refused a non-public address: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Builds (or clears) the preview for a message's first link and tells the
 * group. Called from `after()` once the message is saved, so sending never
 * waits for someone else's website. Best-effort.
 */
export async function attachLinkPreview(messageId: number, groupId: string, body: string | null, opts: { clearIfNone?: boolean } = {}): Promise<void> {
  const link = firstUrl(body);
  if (!link && !opts.clearIfNone) return;
  const preview = link ? await fetchLinkPreview(link) : null;
  if (!preview && !opts.clearIfNone) return;

  const { error } = await createServiceClient().rpc("d1_set_link_preview", {
    p_message: messageId,
    p_preview: preview ? sealBody(JSON.stringify(preview), groupId) : null,
  });
  if (error) {
    console.error("⚠️ Destiny One link preview save failed:", error.message);
    return;
  }
  await broadcastToGroup(groupId, "link_preview", { id: messageId, groupId, preview });
}
