"use client";
import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function CheckoutForm({ onSuccess, onError, total }: {
  onSuccess: () => void;
  onError: (msg: string) => void;
  total: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message || "Payment failed");
      setProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-gold text-dark py-4 font-semibold text-sm tracking-[0.15em] uppercase hover:bg-gold-light transition-colors disabled:opacity-40"
      >
        {processing ? "Processing..." : `Pay $${total.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function StripePayment({ clientSecret, total, onSuccess, onError }: {
  clientSecret: string;
  total: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  if (!stripePromise) {
    return <p className="text-red-400 text-sm">Stripe is not configured.</p>;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#C8A96A",
            colorBackground: "#0B0B0B",
            colorText: "#F5F0E8",
            colorDanger: "#ef4444",
            borderRadius: "0px",
            fontFamily: "inherit",
          },
          rules: {
            ".Input": {
              border: "1px solid #2A2A2A",
              backgroundColor: "#0B0B0B",
              color: "#F5F0E8",
            },
            ".Input:focus": {
              borderColor: "#C8A96A",
              boxShadow: "none",
            },
            ".Label": {
              color: "#B8B0A2",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            },
          },
        },
      }}
    >
      <CheckoutForm onSuccess={onSuccess} onError={onError} total={total} />
    </Elements>
  );
}
