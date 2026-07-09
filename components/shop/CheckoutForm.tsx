"use client";

import { useState } from "react";
import {
  ExpressCheckoutElement,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { formatPrice } from "@/lib/shop";

// Inner payment step — must be rendered inside <Elements>. Confirms the
// PaymentIntent and redirects to the success page on completion.
export default function CheckoutForm({
  orderNumber,
  totalPennies,
}: {
  orderNumber: string;
  totalPennies: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether any express wallet (Apple Pay / Google Pay / Link) is available on
  // this device — drives showing the express button + divider.
  const [hasExpress, setHasExpress] = useState(false);

  const returnUrl = () =>
    `${window.location.origin}/shop/checkout/success?order=${encodeURIComponent(orderNumber)}`;

  // Shared confirmation used by both the card form and the express wallets.
  // In clientSecret-based Elements, confirmPayment reads the PaymentIntent
  // from `elements`, so the same call finalises either path.
  async function confirm() {
    if (!stripe || !elements) return;
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl() },
    });
    // If we reach here, confirmation failed immediately (otherwise Stripe
    // redirects to return_url). Show the message and let them retry.
    if (stripeError) {
      setError(
        stripeError.message || "We couldn't take your payment. Please try again.",
      );
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    await confirm();
  }

  // Fired after the customer authorises in the Apple Pay / Google Pay sheet.
  async function handleExpressConfirm() {
    setSubmitting(true);
    setError(null);
    await confirm();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Apple Pay / Google Pay / Link — one-tap wallets. Renders only when a
          wallet is actually available (Safari on Apple devices, etc.). */}
      <div className={hasExpress ? "space-y-4" : "hidden"}>
        <ExpressCheckoutElement
          onConfirm={handleExpressConfirm}
          onReady={({ availablePaymentMethods }) =>
            setHasExpress(Boolean(availablePaymentMethods))
          }
          onLoadError={() => setHasExpress(false)}
          options={{ buttonHeight: 48 }}
        />
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.15em] text-destiny-grey/40">
          <span className="h-px flex-1 bg-black/10" />
          Or pay by card
          <span className="h-px flex-1 bg-black/10" />
        </div>
      </div>

      {/* Card fields. Wallets are handled by the Express Checkout Element above,
          so suppress the Payment Element's own wallet buttons to avoid showing
          Apple Pay twice. */}
      <PaymentElement
        options={{ wallets: { applePay: "never", googlePay: "never" } }}
      />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-destiny-orange px-7 py-4 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:bg-destiny-orange-dark disabled:cursor-not-allowed disabled:bg-destiny-grey/30 disabled:shadow-none"
      >
        {submitting ? (
          "Processing…"
        ) : (
          <>
            <span className="material-symbols-rounded text-lg">lock</span>
            Pay {formatPrice(totalPennies)}
          </>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-destiny-grey/50">
        <span className="material-symbols-rounded text-sm">verified_user</span>
        Secured by Stripe — your card details never touch our servers.
      </p>
    </form>
  );
}
