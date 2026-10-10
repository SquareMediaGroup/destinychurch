"use server";

import { headers } from "next/headers";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

// Public (every page's footer) and it opens GitHub issues with our token, so
// it is throttled per IP and fenced with a honeypot — without these anyone
// could script unlimited issues onto the repo.
export async function submitBugReport(formData: FormData) {
  // Honeypot first, answered like a success so a bot can't learn what tripped it.
  if (formData.get("website")?.toString().trim()) {
    return { success: true };
  }

  const { limited } = checkRateLimit(`bugreport:${clientIp(await headers())}`, 3);
  if (limited) {
    return { success: false, error: "Too many reports. Please wait a few minutes and try again." };
  }

  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const steps = formData.get("steps")?.toString().trim();
  const pageUrl = formData.get("pageUrl")?.toString().trim() ?? "";

  if (!name || !email || !steps) {
    return { success: false, error: "Please fill in your name, email and how to reproduce the bug." };
  }

  if (name.length > 120 || email.length > 254 || steps.length > 5000 || pageUrl.length > 500) {
    return { success: false, error: "That's longer than we can take — please shorten it." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error("🐛 GitHub token is missing in environment variables.");
    return { success: false, error: "Server misconfiguration. Please try again later." };
  }

  const issueTitle = `Bug Report: ${name}`;
  const issueBody = `
**Reported by:** ${name} (${email})
${pageUrl ? `**Page:** ${pageUrl}` : ""}

### How to reproduce
${steps}
`;

  try {
    const response = await fetch("https://api.github.com/repos/SquareMediaGroup/destinychurch/issues", {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${githubToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ["bug", "user-reported"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${errorText}`);
    }

    return { success: true };
  } catch (err) {
    console.error("🐛 Bug report error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
