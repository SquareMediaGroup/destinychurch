/**
 * Branded password-reset email, matching the look of the other transactional
 * emails in the repo (contact form, hire enquiry, etc.): white card on soft
 * grey, dark-mode overrides, Destiny accent, sent through Resend.
 */

const ACCENT = "#f5821f"; // destiny orange
const ACCENT_SHADOW = "rgba(245,130,31,0.35)";

export function buildPasswordResetEmailHtml(resetUrl: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>Reset your password</title>
    <style>
      @media (prefers-color-scheme: dark) {
        .em-body    { background: linear-gradient(135deg, #1c0f06 0%, #0d0d0d 60%, #111318 100%) !important; }
        .em-wrap    { background: linear-gradient(135deg, #1c0f06 0%, #0d0d0d 60%, #111318 100%) !important; }
        .em-card    { background: rgba(255,255,255,0.06) !important; border-color: rgba(255,255,255,0.10) !important; }
        .em-inner   { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.08) !important; }
        .em-h1      { color: #ffffff !important; }
        .em-intro   { color: rgba(255,255,255,0.55) !important; }
        .em-fallback{ color: rgba(255,255,255,0.45) !important; }
        .em-link    { color: ${ACCENT} !important; }
        .em-footer  { color: rgba(255,255,255,0.30) !important; }
        .em-flink   { color: rgba(255,255,255,0.40) !important; }
        .em-badge   { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.12) !important; }
        .em-logo-light { display: block !important; }
        .em-logo-dark  { display: none  !important; }
      }
    </style>
  </head>
  <body class="em-body" style="margin:0;padding:0;background:#f5f7fa;">

    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Reset your Destiny Church admin password — this link expires in 1 hour.
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

          <!-- Card -->
          <table role="presentation" class="em-card" width="100%" cellpadding="0" cellspacing="0"
            style="max-width:560px;background:#ffffff;border-radius:24px;border:1px solid rgba(0,0,0,0.07);box-shadow:0 8px 32px rgba(0,0,0,0.08);text-align:center;overflow:hidden;">

            <tr>
              <td style="height:4px;background:${ACCENT};"></td>
            </tr>

            <tr>
              <td style="padding:32px 28px 8px 28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
                <span class="em-badge" style="display:inline-block;padding:5px 16px;border-radius:999px;background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.08);color:${ACCENT};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                  Reset Password
                </span>
                <h1 class="em-h1" style="margin:18px 0 10px 0;font-size:24px;line-height:1.2;font-weight:800;color:#1a1a1a;">
                  Reset your password
                </h1>
                <p class="em-intro" style="margin:0 0 28px 0;font-size:14px;line-height:1.7;color:#6b7280;">
                  We received a request to reset the password for your Destiny Church admin account. Tap the button below to choose a new one. This link expires in 1 hour.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:0 24px 8px 24px;">
                <a
                  href="${resetUrl}"
                  style="display:inline-block;padding:14px 40px;border-radius:999px;background:${ACCENT};color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.01em;box-shadow:0 4px 20px ${ACCENT_SHADOW};"
                >
                  Reset password
                </a>
              </td>
            </tr>

            <!-- Fallback link -->
            <tr>
              <td style="padding:20px 32px 36px 32px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
                <p class="em-fallback" style="margin:0 0 6px 0;font-size:12px;line-height:1.6;color:#9ca3af;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;">
                  <a class="em-link" href="${resetUrl}" style="color:${ACCENT};text-decoration:underline;">${resetUrl}</a>
                </p>
              </td>
            </tr>

          </table>

          <!-- Footer -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="padding:24px 16px 40px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial,sans-serif;text-align:center;">
                <p class="em-footer" style="margin:0 0 8px 0;font-size:12px;color:#9ca3af;">
                  Didn't request this? You can safely ignore this email — your password won't change.
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
