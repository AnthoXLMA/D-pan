// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import admin from "firebase-admin";  // 🔹 Firebase admin
import { createPaymentIntent, capturePaymentIntent, refundPaymentIntent } from "./stripeService.js";

// Initialisation Firebase Admin (si pas déjà fait ailleurs)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const app = express();
app.use(cors());
app.use(express.json());

// Middleware de log
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`, req.body);
  next();
});

/**
 * 1️⃣ Créer un paiement (escrow)
 */
app.post("/create-payment", async (req, res) => {
  const { reportId, amount } = req.body; // ✅ récupère bien reportId et amount
  try {
    console.log(`➡️ Création PaymentIntent pour report ${reportId}, montant: ${amount}`);

    const paymentIntent = await createPaymentIntent(amount);
    console.log("✅ PaymentIntent créé :", paymentIntent.id, "statut:", paymentIntent.status);

    // 🔹 Met à jour Firestore avec l'état du séquestre
    await admin.firestore().collection("reports").doc(reportId).update({
      escrowStatus: "created",
      status: "séquestre confirmé",
      paymentIntentId: paymentIntent.id,
      status :"created"
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error("❌ Erreur create-payment :", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2️⃣ Libérer le paiement (capture)
 */
app.post("/release-payment", async (req, res) => {
  const { reportId, paymentIntentId } = req.body; // ✅ on passe aussi reportId
  try {
    console.log(`➡️ Capture PaymentIntent ${paymentIntentId}`);

    const paymentIntent = await capturePaymentIntent(paymentIntentId);
    console.log("✅ Paiement capturé :", paymentIntent.id, "statut:", paymentIntent.status);

    // 🔹 Met à jour Firestore après capture
    await admin.firestore().collection("reports").doc(reportId).update({
      escrowStatus: "released",
      status: "terminé",
    });

    res.json({ success: true, paymentIntent });
  } catch (err) {
    console.error("❌ Erreur release-payment :", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3️⃣ Rembourser (refund)
 */
app.post("/refund-payment", async (req, res) => {
  const { reportId, paymentIntentId } = req.body;
  try {
    console.log(`➡️ Refund PaymentIntent ${paymentIntentId}`);
    const refund = await refundPaymentIntent(paymentIntentId);
    console.log("✅ Paiement remboursé :", refund.id);

    // 🔹 Met à jour Firestore après refund
    await admin.firestore().collection("reports").doc(reportId).update({
      escrowStatus: "refunded",
      status: "remboursé",
    });

    res.json({ success: true, refund });
  } catch (err) {
    console.error("❌ Erreur refund-payment :", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Stripe server running on port ${PORT}`));
