"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function buildHireEmailHtml(fields: {
  name: string;
  email: string;
  phone: string;
  organisation: string;
  eventType: string;
  space: string;
  date: string;
  startTime: string;
  endTime: string;
  attendance: string;
  requirements: string;
  message: string;
}) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");

  const rows = [
    ["Name", fields.name],
    ["Email", fields.email],
    ["Phone", fields.phone],
    ["Organisation / Group", fields.organisation || "—"],
    ["Event Type", fields.eventType],
    ["Space Requested", fields.space],
    ["Date", fields.date],
    ["Start Time", fields.startTime],
    ["End Time", fields.endTime],
    ["Expected Attendance", fields.attendance],
    ["AV / Special Requirements", fields.requirements || "—"],
    ["Additional Information", fields.message || "—"],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <p style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">${label}</p>
      <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#111827;">${esc(value)}</p>
    `
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Venue Hire Enquiry</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Venue hire enquiry from ${esc(fields.name)} — ${esc(fields.space)} on ${esc(fields.date)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;">
    <tr>
      <td align="center" style="padding:40px 16px 0 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="max-width:560px;background:#ffffff;border-radius:24px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 8px 32px rgba(0,0,0,0.08);overflow:hidden;">
          <tr><td style="height:4px;background:#F58021;"></td></tr>
          <tr>
            <td style="padding:32px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
              <span style="display:inline-block;padding:5px 16px;border-radius:999px;background:rgba(245,128,33,0.1);color:#F58021;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                Venue Hire
              </span>
              <h1 style="margin:18px 0 10px 0;font-size:24px;font-weight:800;color:#1a1a1a;">New Hire Enquiry</h1>
              <p style="margin:0 0 28px 0;font-size:14px;line-height:1.7;color:#6b7280;">
                A venue hire enquiry has been submitted through the website.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px 24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb;border-radius:16px;border:1px solid rgba(0,0,0,0.06);">
                <tr><td style="padding:22px 22px 6px 22px;">${rowsHtml}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px 36px 24px;">
              <a href="mailto:${esc(fields.email)}?subject=Re: Venue Hire Enquiry — ${esc(fields.space)}"
                style="display:inline-block;padding:14px 36px;border-radius:999px;background:#F58021;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;">
                Reply to ${esc(fields.name)}
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 40px;font-size:12px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;">
          Destiny Church Tees Valley &bull;
          <a href="https://destinytees.uk" style="color:#9ca3af;text-decoration:underline;">destinytees.uk</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function submitHireEnquiry(formData: FormData) {
  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const phone = formData.get("phone")?.toString().trim() ?? "";
  const organisation = formData.get("organisation")?.toString().trim() ?? "";
  const eventType = formData.get("event_type")?.toString().trim() ?? "";
  const space = formData.get("space")?.toString().trim() ?? "";
  const date = formData.get("date")?.toString().trim() ?? "";
  const startTime = formData.get("start_time")?.toString().trim() ?? "";
  const endTime = formData.get("end_time")?.toString().trim() ?? "";
  const attendance = formData.get("attendance")?.toString().trim() ?? "";
  const requirements = formData.get("requirements")?.toString().trim() ?? "";
  const message = formData.get("message")?.toString().trim() ?? "";

  if (!name || !email || !phone || !eventType || !space || !date || !startTime || !endTime || !attendance) {
    return { success: false, error: "Please fill in all required fields." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("hire_enquiries").insert({
      name, email, phone, organisation, event_type: eventType,
      space, date, start_time: startTime, end_time: endTime,
      attendance, requirements, message,
      created_at: new Date().toISOString(),
    });

    await resend.emails.send({
      from: "Destiny Church <noreply@support.squaremediagroup.org>",
      to: "techteam@destinytees.uk",
      subject: `Venue Hire Enquiry: ${space} — ${date} (${name})`,
      html: buildHireEmailHtml({ name, email, phone, organisation, eventType, space, date, startTime, endTime, attendance, requirements, message }),
    });

    return { success: true };
  } catch (err) {
    console.error("Hire enquiry error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
