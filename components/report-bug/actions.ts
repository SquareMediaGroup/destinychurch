"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// 10MB ceiling — keeps the outgoing email well within provider limits.
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildBugReportHtml(name: string, email: string, steps: string, pageUrl: string, hasScreenshot: boolean) {
  const escapedName = escapeHtml(name);
  const escapedEmail = escapeHtml(email);
  const escapedSteps = escapeHtml(steps).replace(/\n/g, "<br />");
  const escapedUrl = escapeHtml(pageUrl);

  const accentColor = "#F58021";
  const accentShadow = "rgba(245,128,33,0.4)";
  const bgGradient = "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 60%, #111318 100%)";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Bug Report</title>
    <style>
      @media (prefers-color-scheme: dark) {
        .em-body    { background: ${bgGradient} !important; }
        .em-wrap    { background: ${bgGradient} !important; }
        .em-card    { background: rgba(255,255,255,0.06) !important; border-color: rgba(255,255,255,0.10) !important; }
        .em-inner   { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.08) !important; }
        .em-divider { background: rgba(255,255,255,0.08) !important; }
        .em-h1      { color: #ffffff !important; }
        .em-intro   { color: rgba(255,255,255,0.55) !important; }
        .em-label   { color: rgba(255,255,255,0.35) !important; }
        .em-name    { color: #ffffff !important; }
        .em-subj    { color: #ffffff !important; }
        .em-msg     { color: rgba(255,255,255,0.75) !important; }
        .em-badge   { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.12) !important; }
        .em-footer  { color: rgba(255,255,255,0.30) !important; }
        .em-flink   { color: rgba(255,255,255,0.40) !important; }
        .em-logo-light { display: block !important; }
        .em-logo-dark  { display: none  !important; }
      }
    </style>
  </head>
  <body class="em-body" style="margin:0;padding:0;background:#f5f7fa;">

    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      New bug report from ${escapedName}
    </div>

    <table role="presentation" class="em-wrap" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;">
      <tr>
        <td align="center" style="padding:40px 16px 0 16px;">

          <img class="em-logo-dark"
            src="https://destinytees.uk/wp-content/uploads/2022/11/Full-Logo-Colour.svg"
            width="180" alt="Destiny Church"
            style="display:block;margin:0 auto 28px auto;border:0;outline:none;text-decoration:none;height:auto;max-width:100%;"
          />
          <img class="em-logo-light"
            src="https://destinytees.uk/wp-content/uploads/2022/11/Full_Logo_White_Text-1.webp"
            width="180" alt="Destiny Church"
            style="display:none;margin:0 auto 28px auto;border:0;outline:none;text-decoration:none;height:auto;max-width:100%;"
          />

          <table role="presentation" class="em-card" width="100%" cellpadding="0" cellspacing="0"
            style="max-width:560px;background:#ffffff;border-radius:24px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 8px 32px rgba(0,0,0,0.08);text-align:center;overflow:hidden;">

            <tr>
              <td style="height:4px;background:${accentColor};"></td>
            </tr>

            <tr>
              <td style="padding:32px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
                <span class="em-badge" style="display:inline-block;padding:5px 16px;border-radius:999px;background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.08);color:${accentColor};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                  Bug Report
                </span>
                <h1 class="em-h1" style="margin:18px 0 10px 0;font-size:24px;line-height:1.2;font-weight:800;color:#1a1a1a;">
                  New Bug Report
                </h1>
                <p class="em-intro" style="margin:0 0 28px 0;font-size:14px;line-height:1.7;color:#6b7280;">
                  Someone reported a bug through the website. Details are below${hasScreenshot ? ", with a screenshot attached" : ""}.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 24px 24px 24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:left;">
                <table role="presentation" class="em-inner" width="100%" cellpadding="0" cellspacing="0"
                  style="background:#f9fafb;border-radius:16px;border:1px solid rgba(0,0,0,0.06);">
                  <tr>
                    <td style="padding:22px 22px 6px 22px;">

                      <p class="em-label" style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">Reported by</p>
                      <p class="em-name" style="margin:0 0 3px 0;font-size:15px;font-weight:700;color:#111827;">${escapedName}</p>
                      <p style="margin:0 0 20px 0;font-size:13px;">
                        <a href="mailto:${escapedEmail}" style="color:${accentColor};text-decoration:none;">${escapedEmail}</a>
                      </p>

                      ${
                        pageUrl
                          ? `<p class="em-label" style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">Page</p>
                      <p class="em-subj" style="margin:0 0 20px 0;font-size:13px;font-weight:600;color:#111827;word-break:break-all;">
                        <a href="${escapedUrl}" style="color:${accentColor};text-decoration:none;">${escapedUrl}</a>
                      </p>`
                          : ""
                      }

                      <div class="em-divider" style="height:1px;background:rgba(0,0,0,0.07);margin:0 0 20px 0;"></div>

                      <p class="em-label" style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">How to reproduce</p>
                      <p class="em-msg" style="margin:0 0 16px 0;font-size:14px;line-height:1.75;color:#374151;">${escapedSteps}</p>

                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:0 24px 36px 24px;">
                <a
                  href="mailto:${escapedEmail}?subject=Re: Your bug report"
                  style="display:inline-block;padding:14px 36px;border-radius:999px;background:${accentColor};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.01em;box-shadow:0 4px 20px ${accentShadow};"
                >
                  Reply to ${escapedName}
                </a>
              </td>
            </tr>

          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="padding:24px 16px 40px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
                <p class="em-footer" style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;">
                  Destiny Church Tees Valley
                </p>
                <p style="margin:0;font-size:12px;">
                  <a class="em-flink" href="https://destinytees.uk" style="color:#9ca3af;text-decoration:underline;">Visit Site</a>
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>

  </body>
</html>`;
}

export async function submitBugReport(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const steps = formData.get("steps")?.toString().trim();
  const pageUrl = formData.get("pageUrl")?.toString().trim() ?? "";
  const screenshot = formData.get("screenshot");

  if (!name || !email || !steps) {
    return { success: false, error: "Please fill in your name, email and how to reproduce the bug." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // The screenshot is only ever held in memory here and forwarded straight
  // into the email attachment — nothing is written to disk or stored.
  const attachments: { filename: string; content: Buffer }[] = [];

  if (screenshot instanceof File && screenshot.size > 0) {
    if (!screenshot.type.startsWith("image/")) {
      return { success: false, error: "The screenshot must be an image file." };
    }
    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return { success: false, error: "The screenshot is too large. Please keep it under 10MB." };
    }
    const buffer = Buffer.from(await screenshot.arrayBuffer());
    const safeName = screenshot.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "screenshot.png";
    attachments.push({ filename: safeName, content: buffer });
  }

  try {
    const { error: emailError } = await resend.emails.send({
      from: "Destiny Church <noreply@support.squaremediagroup.org>",
      to: "techteam@destinytees.uk",
      replyTo: email,
      subject: `Bug Report — ${name}`,
      html: buildBugReportHtml(name, email, steps, pageUrl, attachments.length > 0),
      ...(attachments.length > 0 ? { attachments } : {}),
    });

    if (emailError) throw new Error(emailError.message);

    return { success: true };
  } catch (err) {
    console.error("🐛 Bug report error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
