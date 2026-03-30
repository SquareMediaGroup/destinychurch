"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SubjectTheme = {
  accentColor: string;
  accentShadow: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  headline: string;
  intro: string;
  headerBg: string;
  logoSrc: string;
  logoWidth: string;
};

function getTheme(subject: string): SubjectTheme {
  switch (subject) {
    case "Safeguarding":
      return {
        accentColor: "#dc2626",
        accentShadow: "rgba(220,38,38,0.35)",
        badgeBg: "#fef2f2",
        badgeText: "#dc2626",
        badgeLabel: "Safeguarding",
        headline: "Safeguarding Report",
        intro: "A safeguarding concern has been submitted through the website. Please review and respond promptly.",
        headerBg: "#dc2626",
        logoSrc: "https://destinytees.uk/wp-content/uploads/2022/11/Full_Logo_White_Text-1.png",
        logoWidth: "200",
      };
    case "Privacy":
      return {
        accentColor: "#2563eb",
        accentShadow: "rgba(37,99,235,0.35)",
        badgeBg: "#eff6ff",
        badgeText: "#2563eb",
        badgeLabel: "Privacy",
        headline: "Privacy Enquiry",
        intro: "A privacy-related message has been submitted through the website contact form.",
        headerBg: "#2563eb",
        logoSrc: "https://destinytees.uk/wp-content/uploads/2022/11/Full_Logo_White_Text-1.png",
        logoWidth: "200",
      };
    case "Complaints":
      return {
        accentColor: "#d97706",
        accentShadow: "rgba(217,119,6,0.35)",
        badgeBg: "#fffbeb",
        badgeText: "#d97706",
        badgeLabel: "Complaint",
        headline: "New Complaint Received",
        intro: "A complaint has been submitted through the website. Please review and respond in a timely manner.",
        headerBg: "#d97706",
        logoSrc: "https://destinytees.uk/wp-content/uploads/2022/11/Full_Logo_White_Text-1.png",
        logoWidth: "200",
      };
    case "Enquiries":
      return {
        accentColor: "#F58021",
        accentShadow: "rgba(245,128,33,0.35)",
        badgeBg: "#fff3e8",
        badgeText: "#F58021",
        badgeLabel: "Enquiry",
        headline: "New Enquiry",
        intro: "A new enquiry has been submitted through the website contact form.",
        headerBg: "#363F48",
        logoSrc: "https://destinytees.uk/wp-content/uploads/2022/11/Full_Logo_White_Text-1.png",
        logoWidth: "200",
      };
    default:
      return {
        accentColor: "#F58021",
        accentShadow: "rgba(245,128,33,0.35)",
        badgeBg: "#fff3e8",
        badgeText: "#F58021",
        badgeLabel: "Contact Form",
        headline: "New Message Received",
        intro: "A new message has been submitted through the website contact form.",
        headerBg: "#363F48",
        logoSrc: "https://destinytees.uk/wp-content/uploads/2022/11/Full_Logo_White_Text-1.png",
        logoWidth: "200",
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
    <title>${t.headline}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f6;">

    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      New ${escapedSubject} message from ${escapedName}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;">
      <tr>
        <td align="center" style="padding:34px 16px;">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 32px rgba(0,0,0,0.08);text-align:center;">

            <!-- Coloured header -->
            <tr>
              <td style="background:${t.headerBg};padding:32px 28px 28px 28px;">
                <img
                  src="${t.logoSrc}"
                  width="${t.logoWidth}"
                  alt="Destiny Church"
                  style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;height:auto;max-width:100%;"
                />
              </td>
            </tr>

            <!-- Accent bar -->
            <tr>
              <td style="height:5px;background:${t.accentColor};"></td>
            </tr>

            <!-- Copy -->
            <tr>
              <td style="padding:28px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;color:#0c0a09;text-align:center;">
                <span style="display:inline-block;padding:5px 14px;border-radius:999px;background:${t.badgeBg};color:${t.badgeText};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                  ${t.badgeLabel}
                </span>
                <h1 style="margin:16px 0 10px 0;font-size:22px;line-height:1.25;font-weight:800;color:#0c0a09;">
                  ${t.headline}
                </h1>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:1.7;color:#4a4543;">
                  ${t.intro}
                </p>
              </td>
            </tr>

            <!-- Details card -->
            <tr>
              <td style="padding:0 28px 24px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:left;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9aa3aa;">From</p>
                      <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#0c0a09;">${escapedName}</p>
                      <p style="margin:0 0 20px 0;font-size:14px;color:#4a4543;">
                        <a href="mailto:${escapedEmail}" style="color:${t.accentColor};text-decoration:underline;">${escapedEmail}</a>
                      </p>

                      <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9aa3aa;">Subject</p>
                      <p style="margin:0 0 20px 0;font-size:15px;font-weight:600;color:#0c0a09;">${escapedSubject}</p>

                      <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9aa3aa;">Message</p>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#4a4543;">${escapedMessage}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Reply CTA -->
            <tr>
              <td align="center" style="padding:0 28px 32px 28px;">
                <a
                  href="mailto:${escapedEmail}?subject=Re: ${escapedSubject}"
                  style="display:inline-block;padding:14px 32px;border-radius:999px;background:${t.accentColor};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px ${t.accentShadow};"
                >
                  Reply to ${escapedName}
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 28px 20px 28px;background:#363F48;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
                <p style="margin:0 0 10px 0;font-size:12px;line-height:1.6;color:#e6e9ec;">
                  Destiny Church Tees Valley
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;">
                  <a href="https://destinytees.uk/privacy-policy" style="color:#ffffff;text-decoration:underline;">Privacy Policy</a>
                  <span style="margin:0 10px;color:#9aa3aa;">&bull;</span>
                  <a href="https://destinytees.uk" style="color:#ffffff;text-decoration:underline;">Visit Site</a>
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
