// ── Giving details ───────────────────────────────────────────────────────────
// The bank and text-to-give details the /give page shows, and the giving card
// the assistants show. The values are editable in admin (page_content, page
// "give"); these are the defaults used when a key is missing. Both /give and
// the card read from here, so the fallback cannot drift between them.

import type { InfoCardData } from "@destiny/shared";

export const GIVE_ONLINE_URL = "https://destinytees.churchsuite.com/donate";

export const GIVE_DEFAULTS = {
  account_name: "Destiny Church Tees Valley",
  sort_code: "08-92-99",
  account_number: "67397646",
  text_keyword: "DCTEES",
  text_number: "07380 307 800",
} as const;

export type GiveContent = Record<keyof typeof GIVE_DEFAULTS, string>;

/** page_content rows for "give", with defaults filled in for anything missing or blank. */
export function resolveGiveContent(rows: Record<string, string> | null | undefined): GiveContent {
  const out = { ...GIVE_DEFAULTS } as GiveContent;
  for (const key of Object.keys(GIVE_DEFAULTS) as (keyof typeof GIVE_DEFAULTS)[]) {
    const v = rows?.[key]?.trim();
    if (v) out[key] = v;
  }
  return out;
}

export function buildGivingCard(content: GiveContent): InfoCardData {
  return {
    id: "giving",
    variant: "giving",
    title: "Give to Destiny",
    eyebrow: "Giving",
    summary: "Give online, by bank transfer or by text. UK taxpayers can add Gift Aid, which lets the church reclaim 25p on every 1 pound at no extra cost to you.",
    facts: [
      { label: "Account name", value: content.account_name, copy: true },
      { label: "Sort code", value: content.sort_code, copy: true },
      { label: "Account number", value: content.account_number, copy: true },
      { label: "Reference", value: "Your full name" },
      {
        label: "Text to give",
        value: `Text ${content.text_keyword} to ${content.text_number}, followed by your amount, e.g. "give 10" or "give 10/mo" for monthly`,
      },
    ],
    actions: [
      { label: "Give online", href: GIVE_ONLINE_URL },
      { label: "More ways to give", href: "/give" },
    ],
    image: null,
  };
}
