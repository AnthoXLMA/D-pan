// import express from "express";
// import bodyParser from "body-parser";
// import { createPaymentIntent, capturePayment, refundPayment } from "./stripeService.js";

// const app = express();
// app.use(bodyParser.json());

// // Créer un paiement
// app.post("/api/create-payment", async (req, res) => {
//   const { reportId, amount } = req.body;
//   try {
//     const clientSecret = await createPaymentIntent(reportId, amount);
//     res.json({ clientSecret });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// });

// // Capturer paiement
// app.post("/api/capture-payment", async (req, res) => {
//   const { paymentIntentId } = req.body;
//   try {
//     const result = await capturePayment(paymentIntentId);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// // Rembourser paiement
// app.post("/api/refund-payment", async (req, res) => {
//   const { paymentIntentId } = req.body;
//   try {
//     const result = await refundPayment(paymentIntentId);
//     res.json(result);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// app.listen(4242, () => console.log("Stripe backend running on port 4242"));
