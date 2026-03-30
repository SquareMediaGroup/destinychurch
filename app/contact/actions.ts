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
  // Dark gradient behind the glass card — matches site hero gradients
  bgGradient: string;
  // Tinted glow strip at bottom of header, simulating the glass accent
  glowColor: string;
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
        glowColor: "rgba(239,68,68,0.5)",
      };
    case "Privacy":
      return {
        accentColor: "#3b82f6",
        accentShadow: "rgba(59,130,246,0.4)",
        badgeLabel: "Privacy",
        headline: "Privacy Enquiry",
        intro: "A privacy-related message has been submitted through the website contact form.",
        bgGradient: "linear-gradient(135deg, #0a1628 0%, #071020 60%, #050d1a 100%)",
        glowColor: "rgba(59,130,246,0.5)",
      };
    case "Complaints":
      return {
        accentColor: "#f59e0b",
        accentShadow: "rgba(245,158,11,0.4)",
        badgeLabel: "Complaint",
        headline: "New Complaint Received",
        intro: "A complaint has been submitted through the website. Please review and respond in a timely manner.",
        bgGradient: "linear-gradient(135deg, #1f1200 0%, #140d00 60%, #0d0d0d 100%)",
        glowColor: "rgba(245,158,11,0.5)",
      };
    case "Enquiries":
      return {
        accentColor: "#F58021",
        accentShadow: "rgba(245,128,33,0.4)",
        badgeLabel: "Enquiry",
        headline: "New Enquiry",
        intro: "A new enquiry has been submitted through the website contact form.",
        bgGradient: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 60%, #111318 100%)",
        glowColor: "rgba(245,128,33,0.5)",
      };
    default:
      return {
        accentColor: "#F58021",
        accentShadow: "rgba(245,128,33,0.4)",
        badgeLabel: "Contact Form",
        headline: "New Message Received",
        intro: "A new message has been submitted through the website contact form.",
        bgGradient: "linear-gradient(135deg, #1c0f06 0%, #0d0d0d 60%, #111318 100%)",
        glowColor: "rgba(245,128,33,0.5)",
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
  <body style="margin:0;padding:0;background:#0f0f0f;">

    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      New ${escapedSubject} message from ${escapedName}
    </div>

    <!-- Full dark background wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.bgGradient};">
      <tr>
        <td align="center" style="padding:40px 16px 0 16px;">

          <!-- Logo -->
          <img
            src="https://destinytees.uk/wp-content/uploads/2022/11/Full_Logo_White_Text-1.png"
            width="180"
            alt="Destiny Church"
            style="display:block;margin:0 auto 32px auto;border:0;outline:none;text-decoration:none;height:auto;max-width:100%;"
          />

          <!-- Glass card -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:rgba(255,255,255,0.06);border-radius:24px;border:1px solid rgba(255,255,255,0.10);text-align:center;">

            <!-- Accent glow bar -->
            <tr>
              <td style="height:3px;background:${t.accentColor};border-radius:24px 24px 0 0;"></td>
            </tr>

            <!-- Badge + headline -->
            <tr>
              <td style="padding:32px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
                <span style="display:inline-block;padding:5px 16px;border-radius:999px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:${t.accentColor};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                  ${t.badgeLabel}
                </span>
                <h1 style="margin:18px 0 10px 0;font-size:24px;line-height:1.2;font-weight:800;color:#ffffff;">
                  ${t.headline}
                </h1>
                <p style="margin:0 0 28px 0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.55);">
                  ${t.intro}
                </p>
              </td>
            </tr>

            <!-- Details glass card -->
            <tr>
              <td style="padding:0 24px 24px 24px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:left;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
                  <tr>
                    <td style="padding:22px 22px 6px 22px;">

                      <p style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.35);">From</p>
                      <p style="margin:0 0 3px 0;font-size:15px;font-weight:700;color:#ffffff;">${escapedName}</p>
                      <p style="margin:0 0 20px 0;font-size:13px;">
                        <a href="mailto:${escapedEmail}" style="color:${t.accentColor};text-decoration:none;">${escapedEmail}</a>
                      </p>

                      <p style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.35);">Subject</p>
                      <p style="margin:0 0 20px 0;font-size:15px;font-weight:600;color:#ffffff;">${escapedSubject}</p>

                      <!-- Divider -->
                      <div style="height:1px;background:rgba(255,255,255,0.08);margin:0 0 20px 0;"></div>

                      <p style="margin:0 0 5px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.35);">Message</p>
                      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.75;color:rgba(255,255,255,0.75);">${escapedMessage}</p>

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
                <p style="margin:0 0 8px 0;font-size:12px;color:rgba(255,255,255,0.3);">
                  Destiny Church Tees Valley
                </p>
                <p style="margin:0;font-size:12px;">
                  <a href="https://destinytees.uk/privacy-policy" style="color:rgba(255,255,255,0.4);text-decoration:underline;">Privacy Policy</a>
                  <span style="margin:0 8px;color:rgba(255,255,255,0.2);">&bull;</span>
                  <a href="https://destinytees.uk" style="color:rgba(255,255,255,0.4);text-decoration:underline;">Visit Site</a>
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
