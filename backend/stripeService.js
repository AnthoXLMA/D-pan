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

/**
 * Crée un compte Stripe Express pour un solidaire
 */
export const createStripeAccount = async () => {
  const account = await stripe.accounts.create({
    type: "express",
    country: "FR",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
  return account;
};

/**
 * Crée un account link pour l’onboarding Stripe
 */
export const createAccountLink = async (stripeAccountId, frontendUrl) => {
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${frontendUrl}/onboarding/refresh`,
    return_url: `${frontendUrl}/onboarding/return`,
    type: "account_onboarding",
  });
  return accountLink;
};

/**
 * Crée un login link pour accéder au dashboard Stripe
 */
export const createLoginLink = async (stripeAccountId) => {
  const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
  return loginLink;
};
