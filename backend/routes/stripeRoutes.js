import express from "express";
import {
  createStripeAccount,
  createAccountLink,
  createLoginLink,
} from "../stripeService.js";

const router = express.Router();

// 🔹 Créer un compte Stripe Express
router.post("/create-account", async (req, res) => {
  try {
    const account = await createStripeAccount();
    res.json({ success: true, account });
  } catch (err) {
    console.error("❌ Erreur create-account:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔹 Créer un account link pour onboarding
router.post("/create-account-link", async (req, res) => {
  try {
    const { stripeAccountId, frontendUrl } = req.body;
    if (!stripeAccountId || !frontendUrl) {
      return res
        .status(400)
        .json({ error: "stripeAccountId & frontendUrl requis" });
    }

    const accountLink = await createAccountLink(stripeAccountId, frontendUrl);
    res.json({ success: true, url: accountLink.url });
  } catch (err) {
    console.error("❌ Erreur create-account-link:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🔹 Créer un login link pour accéder au dashboard Stripe
router.post("/create-login-link", async (req, res) => {
  try {
    const { stripeAccountId } = req.body;
    if (!stripeAccountId) {
      return res.status(400).json({ error: "stripeAccountId requis" });
    }

    const loginLink = await createLoginLink(stripeAccountId);
    res.json({ success: true, url: loginLink.url });
  } catch (err) {
    console.error("❌ Erreur create-login-link:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
