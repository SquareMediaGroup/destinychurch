"use server";

import { headers } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

const resend = new Resend(process.env.RESEND_API_KEY);
const BUCKET = "job-applications";
const MAX_CV_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function buildApplicationEmailHtml(fields: {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  coverLetter: string;
  cvName?: string;
}) {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br />");

  const rows: [string, string][] = [
    ["Name", fields.name],
    ["Email", fields.email],
    ["Phone", fields.phone || "—"],
    ["Role", fields.jobTitle],
    ["CV", fields.cvName || "Not attached"],
    ["Cover note", fields.coverLetter || "—"],
  ];

  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <p style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">${label}</p>
      <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#111827;">${esc(value)}</p>
    `,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>Job Application</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;">
    <tr>
      <td align="center" style="padding:40px 16px 0 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="max-width:560px;background:#ffffff;border-radius:24px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 8px 32px rgba(0,0,0,0.08);overflow:hidden;">
          <tr><td style="height:4px;background:#F58021;"></td></tr>
          <tr>
            <td style="padding:32px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
              <span style="display:inline-block;padding:5px 16px;border-radius:999px;background:rgba(245,128,33,0.1);color:#F58021;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                Recruitment
              </span>
              <h1 style="margin:18px 0 10px 0;font-size:24px;font-weight:800;color:#1a1a1a;">New Job Application</h1>
              <p style="margin:0 0 28px 0;font-size:14px;line-height:1.7;color:#6b7280;">
                ${esc(fields.name)} has applied for ${esc(fields.jobTitle)}.
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
              <a href="mailto:${esc(fields.email)}?subject=Re: Your application for ${esc(fields.jobTitle)}"
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

export async function submitApplication(formData: FormData) {
  const jobId = formData.get("job_id")?.toString() || null;
  const jobTitle = formData.get("job_title")?.toString().trim() ?? "";
  const firstName = formData.get("first_name")?.toString().trim() ?? "";
  const lastName = formData.get("last_name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim() ?? "";
  const phone = formData.get("phone")?.toString().trim() ?? "";
  const coverLetter = formData.get("cover_letter")?.toString().trim() ?? "";
  const cv = formData.get("cv");

  if (!jobTitle || !firstName || !lastName || !email) {
    return { success: false, error: "Please fill in all required fields." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // Per-IP rate limit — applications upload files and send email, so the
  // action must not be scriptable for spam or storage flooding.
  const { limited } = checkRateLimit(`jobs:${clientIp(await headers())}`);
  if (limited) {
    return { success: false, error: "Too many submissions. Please wait a few minutes and try again." };
  }

  const supabase = getSupabaseAdmin();

  // Optional CV upload to the private bucket.
  let cvPath: string | null = null;
  let cvName: string | null = null;
  if (cv instanceof File && cv.size > 0) {
    if (cv.size > MAX_CV_BYTES) {
      return { success: false, error: "Your CV must be 10MB or smaller." };
    }
    if (cv.type && !ALLOWED_CV_TYPES.includes(cv.type)) {
      return { success: false, error: "Please upload a PDF or Word document." };
    }
    const safeName = cv.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${jobId ?? "general"}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, cv, { contentType: cv.type, upsert: false });
    if (uploadError) {
      console.error("CV upload error:", uploadError.message);
      return { success: false, error: "We couldn't upload your CV. Please try again." };
    }
    cvPath = path;
    cvName = cv.name;
  }

  try {
    const { error } = await supabase.from("job_applications").insert({
      job_id: jobId,
      job_title: jobTitle,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: phone || null,
      cover_letter: coverLetter || null,
      cv_path: cvPath,
      cv_name: cvName,
    });

    if (error) {
      // Roll back the orphaned CV so storage doesn't drift from the table.
      if (cvPath) await supabase.storage.from(BUCKET).remove([cvPath]);
      console.error("Application insert error:", error.message);
      return { success: false, error: "Something went wrong. Please try again." };
    }

    await resend.emails.send({
      from: "Destiny Church <noreply@support.squaremediagroup.org>",
      to: "techteam@destinytees.uk",
      subject: `Job Application: ${jobTitle} — ${firstName} ${lastName}`,
      html: buildApplicationEmailHtml({
        name: `${firstName} ${lastName}`,
        email,
        phone,
        jobTitle,
        coverLetter,
        cvName: cvName || undefined,
      }),
    });

    return { success: true };
  } catch (err) {
    console.error("Application error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
