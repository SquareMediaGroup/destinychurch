"use server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function buildContactEmailHtml(name: string, email: string, subject: string, message: string) {
  const escapedName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedEmail = email.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedSubject = subject.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escapedMessage = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>New Contact Form Message</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f6f6;">

    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      New contact form submission from ${escapedName} — ${escapedSubject}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f6;">
      <tr>
        <td align="center" style="padding:34px 16px;">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 32px rgba(0,0,0,0.08);text-align:center;">

            <tr>
              <td style="height:6px;background:#F58021;"></td>
            </tr>

            <tr>
              <td style="padding:32px 28px 10px 28px;">
                <img
                  src="https://destinytees.uk/img/brand/destiny-logo-color.svg"
                  width="170"
                  alt="Destiny Church"
                  style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;height:auto;max-width:100%;"
                />
              </td>
            </tr>

            <tr>
              <td style="padding:24px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;color:#0c0a09;text-align:center;">
                <span style="display:inline-block;padding:5px 14px;border-radius:999px;background:#fff3e8;color:#F58021;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                  Contact Form
                </span>
                <h1 style="margin:16px 0 10px 0;font-size:22px;line-height:1.25;font-weight:800;color:#0c0a09;">
                  New Message Received
                </h1>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:1.7;color:#4a4543;">
                  A new message has been submitted through the website contact form.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 28px 24px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:left;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td style="padding:20px 24px;">
                      <p style="margin:0 0 14px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9aa3aa;">From</p>
                      <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#0c0a09;">${escapedName}</p>
                      <p style="margin:0 0 20px 0;font-size:14px;color:#4a4543;">
                        <a href="mailto:${escapedEmail}" style="color:#F58021;text-decoration:underline;">${escapedEmail}</a>
                      </p>

                      <p style="margin:0 0 14px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9aa3aa;">Subject</p>
                      <p style="margin:0 0 20px 0;font-size:15px;font-weight:600;color:#0c0a09;">${escapedSubject}</p>

                      <p style="margin:0 0 14px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#9aa3aa;">Message</p>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#4a4543;">${escapedMessage}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:0 28px 28px 28px;">
                <a
                  href="mailto:${escapedEmail}?subject=Re: ${escapedSubject}"
                  style="display:inline-block;padding:14px 32px;border-radius:999px;background:#F58021;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;box-shadow:0 4px 14px rgba(245,128,33,0.35);"
                >
                  Reply to ${escapedName}
                </a>
              </td>
            </tr>

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
      from: "Destiny Church <noreply@destinytees.uk>",
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
