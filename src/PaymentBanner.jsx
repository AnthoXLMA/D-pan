import React, { useState } from "react";
import {
  createEscrow,
  releaseEscrow,
  refundEscrow,
} from "./services/escrowService";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ShieldCheck, CreditCard, CheckCircle2, XCircle } from "lucide-react";

// Clé publique Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
  console.error("❌ Clé publique Stripe manquante dans .env !");
}

function StripeCheckout({ clientSecret, setPaymentStatus }) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState("");

  const handlePay = async () => {
    if (!stripe || !elements) return;

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (result.error) {
        setStatus("❌ " + result.error.message);
        setPaymentStatus(null);
      } else if (result.paymentIntent.status === "requires_capture") {
        setStatus("✅ Paiement bloqué en séquestre !");
        setPaymentStatus("pending");
      }
    } catch (err) {
      setStatus("❌ " + err.message);
      setPaymentStatus(null);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="border rounded-lg p-3 bg-gray-50">
        <CardElement className="p-2" />
      </div>
      <button
        onClick={handlePay}
        disabled={!stripe}
        className="w-full py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition flex items-center justify-center gap-2"
      >
        <CreditCard size={18} />
        Confirmer le paiement
      </button>
      {status && (
        <p className="text-sm text-gray-600 text-center font-medium">{status}</p>
      )}
    </div>
  );
}

export default function PaymentBanner({ report, solidaire }) {
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

  if (!report || !solidaire) return null;

const handleCreateEscrow = async () => {
  try {
    const data = await createEscrow(report.id, report.frais);
    if (data?.clientSecret) setClientSecret(data.clientSecret);
  } catch (err) {
    console.error("❌ handleCreateEscrow:", err.message);
  }
};


  return (
// <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
// <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white shadow-xl p-4">
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={20} />
            Paiement Sécurisé
          </h3>
          <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-600">
            Escrow
          </span>
        </div>

        {/* Infos */}
        <p className="text-gray-700 mb-1">
          🚗 <span className="font-semibold">{solidaire.name}</span> est en route
        </p>
        <p className="text-gray-700 mb-3">
          💰 Frais :{" "}
          <span className="font-bold text-blue-600">{report.frais} €</span>
        </p>

        {/* Étape 1 : Création escrow */}
        {paymentStatus === null && (
          <button
            onClick={handleCreateEscrow}
            className="w-full py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Bloquer le paiement
          </button>
        )}

        {/* Étape 2 : Paiement Stripe */}
        {clientSecret && paymentStatus === "pending" && (
          <Elements stripe={stripePromise}>
            <StripeCheckout
              clientSecret={clientSecret}
              setPaymentStatus={setPaymentStatus}
            />
          </Elements>
        )}

        {/* États */}
        {paymentStatus === "released" && (
          <p className="mt-3 flex items-center gap-2 text-green-600 font-medium">
            <CheckCircle2 size={18} />
            Paiement libéré au solidaire !
          </p>
        )}
        {paymentStatus === "refunded" && (
          <p className="mt-3 flex items-center gap-2 text-red-600 font-medium">
            <XCircle size={18} />
            Paiement remboursé.
          </p>
        )}

        {/* Actions test (dev only) */}
        {paymentStatus === "pending" && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => releaseEscrow(report.id, setPaymentStatus)}
              className="flex-1 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
            >
              Simuler terminé
            </button>
            <button
              onClick={() => refundEscrow(report.id, setPaymentStatus)}
              className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
            >
              Simuler annulation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
