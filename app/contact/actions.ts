"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SubjectTheme = {
  accentColor: string;
  accentShadow: string;
  badgeLabel: string;
  headline: string;
  intro: string;
  bgGradient: string;
};

function getTheme(subject: string): SubjectTheme {
  switch (subject) {
    case "Safeguarding":
      return {
        accentColor: "#ef4444",
        accentShadow: "rgba(239,68,68,0.4)",
        badgeLabel: "Safeguarding",
        headline: "Safeguarding Report",
        intro: "A safeguarding concern has been submitted through the website. Please review and respond promptly.",
        bgGradient: "linear-gradient(135deg, #2c0a0a 0%, #1a0505 60%, #0d0d0d 100%)",
      };
    case "Privacy":
      return {
        accentColor: "#3b82f6",
        accentShadow: "rgba(59,130,246,0.4)",
        badgeLabel: "Privacy",
        headline: "Privacy Enquiry",
        intro: "A privacy-related message has been submitted through the website contact form.",
        bgGradient: "linear-gradient(135deg, #0a1628 0%, #071020 60%, #050d1a 100%)",
      };
    case "Complaints":
      return {
        accentColor: "#f59e0b",
        accentShadow: "rgba(245,158,11,0.4)",
        badgeLabel: "Complaint",
        headline: "New Complaint Received",
        intro: "A complaint has been submitted through the website. Please review and respond in a timely manner.",
        bgGradient: "linear-gradient(135deg, #1f1200 0%, #140d00 60%, #0d0d0d 100%)",
      };
    case "Enquiries":
      return {
        accentColor: "#F58021",
        accentShadow: "rgba(245,128,33,0.4)",
        badgeLabel: "Enquiry",
        headline: "New Enquiry",
        intro: "A new enquiry has been submitted through the website contact form.",
        bgGradient: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 60%, #111318 100%)",
      };
    default:
      return {
        accentColor: "#F58021",
        accentShadow: "rgba(245,128,33,0.4)",
        badgeLabel: "Contact Form",
        headline: "New Message Received",
        intro: "A new message has been submitted through the website contact form.",
        bgGradient: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 60%, #111318 100%)",
      };
  }
}

function buildContactEmailHtml(name: string, email: string, subject: string, message: string) {
  const escapedName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedEmail = email.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedSubject = subject.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedMessage = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");

  const t = getTheme(subject);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${t.headline}</title>
    <style>
      /* ── Dark mode overrides ── */
      @media (prefers-color-scheme: dark) {
        .em-body    { background: ${t.bgGradient} !important; }
        .em-wrap    { background: ${t.bgGradient} !important; }
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
  <!-- Light mode base: clean white card on soft grey -->
  <body class="em-body" style="margin:0;padding:0;background:#f5f7fa;">

    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      New ${escapedSubject} message from ${escapedName}
    </div>

    <table role="presentation" class="em-wrap" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;">
      <tr>
        <td align="center" style="padding:40px 16px 0 16px;">

          <!-- Logo: dark version for light mode, white version for dark mode -->
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

          <!-- Card -->
          <table role="presentation" class="em-card" width="100%" cellpadding="0" cellspacing="0"
            style="max-width:560px;background:#ffffff;border-radius:24px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 8px 32px rgba(0,0,0,0.08);text-align:center;overflow:hidden;">

            <!-- Accent bar -->
            <tr>
              <td style="height:4px;background:${t.accentColor};"></td>
            </tr>

            <!-- Badge + headline -->
            <tr>
              <td style="padding:32px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
                <span class="em-badge" style="display:inline-block;padding:5px 16px;border-radius:999px;background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.08);color:${t.accentColor};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                  ${t.badgeLabel}
                </span>
                <h1 class="em-h1" style="margin:18px 0 10px 0;font-size:24px;line-height:1.2;font-weight:800;color:#1a1a1a;">
                  ${t.headline}
                </h1>
                <p class="em-intro" style="margin:0 0 28px 0;font-size:14px;line-height:1.7;color:#6b7280;">
                  ${t.intro}
                </p>
              </td>
            </tr>

            <!-- Details inner card -->
            <tr>
              <td style="padding:0 24px 24px 24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:left;">
                <table role="presentation" class="em-inner" width="100%" cellpadding="0" cellspacing="0"
                  style="background:#f9fafb;border-radius:16px;border:1px solid rgba(0,0,0,0.06);">
                  <tr>
                    <td style="padding:22px 22px 6px 22px;">

                      <p class="em-label" style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">From</p>
                      <p class="em-name" style="margin:0 0 3px 0;font-size:15px;font-weight:700;color:#111827;">${escapedName}</p>
                      <p style="margin:0 0 20px 0;font-size:13px;">
                        <a href="mailto:${escapedEmail}" style="color:${t.accentColor};text-decoration:none;">${escapedEmail}</a>
                      </p>

                      <p class="em-label" style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">Subject</p>
                      <p class="em-subj" style="margin:0 0 20px 0;font-size:15px;font-weight:600;color:#111827;">${escapedSubject}</p>

                      <div class="em-divider" style="height:1px;background:rgba(0,0,0,0.07);margin:0 0 20px 0;"></div>

                      <p class="em-label" style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">Message</p>
                      <p class="em-msg" style="margin:0 0 16px 0;font-size:14px;line-height:1.75;color:#374151;">${escapedMessage}</p>

                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Reply CTA -->
            <tr>
              <td align="center" style="padding:0 24px 36px 24px;">
                <a
                  href="mailto:${escapedEmail}?subject=Re: ${escapedSubject}"
                  style="display:inline-block;padding:14px 36px;border-radius:999px;background:${t.accentColor};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.01em;box-shadow:0 4px 20px ${t.accentShadow};"
                >
                  Reply to ${escapedName}
                </a>
              </td>
            </tr>

          </table>

          <!-- Footer -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="padding:24px 16px 40px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
                <p class="em-footer" style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;">
                  Destiny Church Tees Valley
                </p>
                <p style="margin:0;font-size:12px;">
                  <a class="em-flink" href="https://destinytees.uk/privacy-policy" style="color:#9ca3af;text-decoration:underline;">Privacy Policy</a>
                  <span style="margin:0 8px;color:#d1d5db;">&bull;</span>
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

export async function submitContactForm(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const subject = formData.get("subject")?.toString().trim();
  const message = formData.get("message")?.toString().trim();

  if (!name || !email || !subject || !message) {
    return { success: false, error: "Please fill in all fields." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("contact_messages").insert({
      name,
      email,
      subject,
      message,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;

    // Forward email notification to tech team
    const { error: emailError } = await resend.emails.send({
      from: "Destiny Church <noreply@support.squaremediagroup.org>",
      to: "techteam@destinytees.uk",
      subject: `Contact Form: ${subject} — ${name}`,
      html: buildContactEmailHtml(name, email, subject, message),
    });

    if (emailError) throw new Error(emailError.message);

    return { success: true };
  } catch (err) {
    console.error("Contact form error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
