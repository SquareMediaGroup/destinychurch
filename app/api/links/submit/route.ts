// Public: a visitor submitting a form block on a links page.
//
// Reachable by anyone, so nothing in the body is taken on trust:
//   - the block must be an active form block on a published page — the body
//     names a block, it can't describe one;
//   - values are checked against that block's own field list, so a request
//     can't add fields, skip required ones, or smuggle in long strings;
//   - a filled-in honeypot is answered with a quiet success and dropped;
//   - rate-limited per IP at the site-wide default.
// The notification email is sent after the response (after()), and a mail
// failure never fails the submission — it is already stored.

import { NextResponse, after } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/formEmail";
import { sendEmailCard } from "@/lib/emailCard";
import { FormDataSchema, MAIN_SLUG } from "@/lib/linkPages/types";
import { SITE_ORIGIN } from "@/lib/appApi";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LEN: Record<string, number> = { name: 200, email: 254, phone: 40, text: 500, textarea: 2000 };

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (checkRateLimit(`links-form:${ip}`).limited)
    return NextResponse.json({ error: "Too many submissions — please wait a minute and try again." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as {
    blockId?: unknown;
    values?: unknown;
    website?: unknown;
  } | null;
  if (!body || typeof body.blockId !== "string" || !UUID_RE.test(body.blockId))
    return NextResponse.json({ error: "That form isn't available." }, { status: 400 });

  // Honeypot: a person never sees this field. Pretend it worked.
  if (typeof body.website === "string" && body.website.trim() !== "")
    return NextResponse.json({ ok: true });

  const supabase = createServiceClient();
  const { data: block } = await supabase
    .from("link_blocks")
    .select("id, page_id, type, data, active, link_pages!inner(slug, title, published)")
    .eq("id", body.blockId)
    .eq("type", "form")
    .eq("active", true)
    .eq("link_pages.published", true)
    .maybeSingle();
  if (!block) return NextResponse.json({ error: "That form isn't available any more." }, { status: 404 });

  const parsed = FormDataSchema.safeParse(block.data);
  if (!parsed.success) return NextResponse.json({ error: "That form isn't available." }, { status: 404 });
  const form = parsed.data;

  const input = (body.values && typeof body.values === "object" ? body.values : {}) as Record<string, unknown>;
  const stored: Record<string, { label: string; value: string | boolean }> = {};
  let email: string | null = null;

  for (const field of form.fields) {
    const raw = input[field.id];
    if (field.kind === "checkbox") {
      const checked = raw === true;
      if (field.required && !checked)
        return NextResponse.json({ error: `Please tick “${field.label}”.` }, { status: 400 });
      stored[field.id] = { label: field.label, value: checked };
      continue;
    }

    const value = typeof raw === "string" ? raw.trim() : "";
    if (field.required && !value)
      return NextResponse.json({ error: `“${field.label}” is required.` }, { status: 400 });
    if (value.length > (MAX_LEN[field.kind] ?? 500))
      return NextResponse.json({ error: `“${field.label}” is too long.` }, { status: 400 });
    if (field.kind === "email" && value) {
      if (!isValidEmail(value))
        return NextResponse.json({ error: `“${field.label}” doesn't look like an email address.` }, { status: 400 });
      email ??= value.toLowerCase();
    }
    stored[field.id] = { label: field.label, value };
  }

  const { error } = await supabase.from("link_form_submissions").insert({
    page_id: block.page_id,
    block_id: block.id,
    block_label: form.title,
    email,
    data: stored,
  });
  if (error) {
    console.error("⚠️ Links form submission failed:", error.message);
    return NextResponse.json({ error: "Something went wrong saving that. Please try again." }, { status: 500 });
  }

  if (form.notifyEmail) {
    const pageInfo = (Array.isArray(block.link_pages) ? block.link_pages[0] : block.link_pages) as
      | { slug: string; title: string }
      | undefined;
    const path = !pageInfo || pageInfo.slug === MAIN_SLUG ? "/links" : `/links/${pageInfo.slug}`;
    after(() =>
      sendEmailCard({
        to: form.notifyEmail,
        subject: `New “${form.title}” response from ${path}`,
        badge: "Links page form",
        heading: form.title,
        intro: `Someone filled in the “${form.title}” form on ${path}.`,
        rows: Object.values(stored).map((v) => [
          v.label,
          typeof v.value === "boolean" ? (v.value ? "Yes" : "No") : v.value || "—",
        ]),
        // SITE_ORIGIN, not destinytees.uk: that domain doesn't serve this app yet.
        ctaHref: `${SITE_ORIGIN}/admin/links/${block.page_id}?tab=responses`,
        ctaLabel: "View all responses",
      }).catch((err) => console.error("📧 Links form notification threw:", err)),
    );
  }

  return NextResponse.json({ ok: true });
}
