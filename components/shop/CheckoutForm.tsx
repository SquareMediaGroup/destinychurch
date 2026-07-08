"use client";

import { useState } from "react";
import {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const returnUrl = `${window.location.origin}/shop/checkout/success?order=${encodeURIComponent(orderNumber)}`;
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

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
