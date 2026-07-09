#!/usr/bin/env node
// One-off: register a domain with Stripe so Apple Pay (and other wallets) can
// show in the Payment Element / Express Checkout Element. Stripe hosts the
// Apple domain-association file for you — no /.well-known file to deploy.
//
// Requires a LIVE (or TEST) Stripe secret key. The keys live in Vercel, not in
// the repo, so pass one explicitly:
//
//   STRIPE_SECRET_KEY=sk_live_xxx node scripts/register-apple-pay-domain.mjs destinytees.uk
//
// Register every domain that renders the checkout — apex + any subdomain
// (e.g. www.destinytees.uk) and preview domains you test Apple Pay on.
// Docs: https://docs.stripe.com/apple-pay?platform=web

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("❌ Set STRIPE_SECRET_KEY (live or test) in the environment.");
  process.exit(1);
}

const domains = process.argv.slice(2);
if (domains.length === 0) {
  console.error("❌ Usage: node scripts/register-apple-pay-domain.mjs <domain> [domain2 ...]");
  process.exit(1);
}

const mode = key.startsWith("sk_live_") ? "LIVE" : key.startsWith("sk_test_") ? "TEST" : "UNKNOWN";
console.log(`🔑 Using ${mode} key\n`);

for (const domain of domains) {
  const res = await fetch("https://api.stripe.com/v1/payment_method_domains", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ domain_name: domain }),
  });
  const body = await res.json();
  if (!res.ok) {
    // Already-registered domains return a friendly error we can ignore.
    console.error(`⚠️  ${domain}: ${body.error?.message ?? res.statusText}`);
    continue;
  }
  const apple = body.apple_pay?.status ?? "unknown";
  console.log(`✅ ${domain} registered — Apple Pay: ${apple}, enabled: ${body.enabled}`);
}

console.log("\nℹ️  Also confirm Apple Pay is toggled on under Stripe Dashboard → Settings → Payment methods.");
