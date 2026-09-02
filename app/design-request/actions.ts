"use server";

import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { isValidEmail } from "@/lib/formEmail";
import {
  hashIp,
  isHoneypotTripped,
  resolveRequesterIdentity,
} from "@/lib/designTickets.server";
import { sendNewRequestAlert, sendRequestReceivedEmail } from "@/lib/designEmail";
import { DESIGN_CATEGORY_LABELS, type DesignTicketCategory } from "@/lib/designTickets";

export interface DesignRequestResult {
  success: boolean;
  error?: string;
  /** The share token, so the form can show the tracking link immediately. */
  token?: string;
  ref?: number;
  fastTracked?: boolean;
}

const CATEGORIES = Object.keys(DESIGN_CATEGORY_LABELS) as DesignTicketCategory[];

export async function submitDesignRequest(formData: FormData): Promise<DesignRequestResult> {
  // The honeypot goes first and answers like a success. A bot that learns which
  // of its submissions were rejected learns how to stop being rejected.
  if (isHoneypotTripped(formData.get("website"))) {
    return { success: true, token: undefined };
  }

  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const title = formData.get("title")?.toString().trim() ?? "";
  const brief = formData.get("brief")?.toString().trim() ?? "";
  const phone = formData.get("phone")?.toString().trim() ?? "";
  const specs = formData.get("specs")?.toString().trim() ?? "";
  const neededBy = formData.get("needed_by")?.toString().trim() ?? "";
  const rawCategory = formData.get("category")?.toString().trim() ?? "other";

  if (!name || !email || !title || !brief) {
    return { success: false, error: "Please fill in your name, email, and what you need." };
  }
  if (name.length > 200 || email.length > 254 || title.length > 200) {
    return { success: false, error: "That's longer than we can store — please shorten it." };
  }
  if (brief.length > 5000 || specs.length > 2000) {
    return { success: false, error: "Your brief is a little long — please trim it down." };
  }
  if (!isValidEmail(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const category = (CATEGORIES as string[]).includes(rawCategory)
    ? (rawCategory as DesignTicketCategory)
    : "other";

  const ip = clientIp(await headers());
  const { limited } = checkRateLimit(`design-request:${ip}`);
  if (limited) {
    return {
      success: false,
      error: "That's a few requests in quick succession — please wait a few minutes.",
    };
  }

  const supabase = createServiceClient();

  // Priority, verification and the staff link come from the session, never from
  // the form. Fast-track is not something a field can ask for.
  const identity = await resolveRequesterIdentity(supabase, name, email);

  try {
    const { data, error } = await supabase
      .from("design_tickets")
      .insert({
        title,
        brief,
        category,
        needed_by: neededBy || null,
        specs: specs || null,
        requester_name: identity.name || name,
        requester_email: identity.email,
        requester_phone: phone || null,
        requester_auth_user_id: identity.authUserId,
        requester_staff_id: identity.staffId,
        requester_verified: identity.verified,
        priority: identity.priority,
        requester_ip_hash: hashIp(ip),
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("design_ticket_events").insert({
      ticket_id: data.id,
      kind: "status",
      actor_type: "requester",
      actor_name: data.requester_name,
      to_status: "open",
      body: "Request submitted.",
    });

    // Email is a courtesy on top of a ticket that already exists. If Resend is
    // down the request is still filed, and the page still shows the link.
    try {
      await Promise.all([sendRequestReceivedEmail(data), sendNewRequestAlert(data)]);
    } catch (emailErr) {
      console.error("📧 Design request email failed:", emailErr);
    }

    return {
      success: true,
      token: data.share_token,
      ref: data.ref,
      fastTracked: identity.priority === "fast_track",
    };
  } catch (err) {
    console.error("🎨 Design request error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
