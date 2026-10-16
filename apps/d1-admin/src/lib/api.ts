// The two API clients, both from the shared package so they can't drift from
// the server's types:
//   api    — /api/app/v1/one/*: chat, the same API the phone app uses.
//   admin  — /api/admin/destiny-one/*: the website's admin API, with the
//            Supabase token as a bearer (cookies don't exist here).

import { createDestinyOneAdminClient, createDestinyOneClient } from "@destiny/shared";
import { config } from "@/lib/config";
import { apiFetch } from "@/lib/native";
import { accessToken } from "@/lib/supabase";

export const api = createDestinyOneClient({ baseUrl: config.apiBaseUrl, getAccessToken: accessToken, fetchImpl: apiFetch });
export const admin = createDestinyOneAdminClient({ baseUrl: config.apiBaseUrl, getAccessToken: accessToken, fetchImpl: apiFetch });

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Please try again.";
}
