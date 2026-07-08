// Server-side Stripe client (singleton). Never import this from client code.
import "server-only";
import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  // Pin nothing — use the account's default API version so the SDK and dashboard
  // stay in sync. `typescript: true` gives us fully-typed responses.
  stripe = new Stripe(key, { typescript: true });
  return stripe;
}
