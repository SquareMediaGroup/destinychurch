"use server";

export async function submitBugReport(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const steps = formData.get("steps")?.toString().trim();
  const pageUrl = formData.get("pageUrl")?.toString().trim() ?? "";

  if (!name || !email || !steps) {
    return { success: false, error: "Please fill in your name, email and how to reproduce the bug." };
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
