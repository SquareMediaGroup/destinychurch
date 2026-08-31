// Shared by the public form server actions (contact, hire, jobs) so the
// escaping/validation logic used to build notification emails can't drift
// between copies — see REPOSITORY_DOCUMENTATION.md for which routes use this.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/** HTML-escape a value for interpolation into an email template. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Same as escapeHtml, but also converts newlines to <br /> for multi-line fields. */
export function escapeHtmlMultiline(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br />");
}
