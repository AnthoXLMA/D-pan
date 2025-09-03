// stripeService.js
import Stripe from "stripe";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15", // tu peux mettre la version la plus récente si besoin
});

/**
 * Créer un PaymentIntent en mode "manual" (escrow)
 */
export const createPaymentIntent = async (amount) => {
  if (!amount || amount <= 0) {
    throw new Error("Montant invalide pour le paiement");
  }

  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // ✅ sécurité : toujours en centimes
    currency: "eur",
    capture_method: "manual", // ⚡ bloque l’argent sans capturer
  });
};

/**
 * Capturer un paiement (libérer au solidaire)
 */
export const capturePaymentIntent = async (paymentIntentId) => {
  if (!paymentIntentId) throw new Error("PaymentIntent ID manquant");
  return await stripe.paymentIntents.capture(paymentIntentId);
};

/**
 * Rembourser un paiement
 */
export const refundPaymentIntent = async (paymentIntentId) => {
  if (!paymentIntentId) throw new Error("PaymentIntent ID manquant");
  return await stripe.refunds.create({ payment_intent: paymentIntentId });
};
