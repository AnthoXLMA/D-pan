// import "dotenv/config";
// import express from "express";
// import cors from "cors";
// import admin from "firebase-admin";
// import stripeRoutes from "./routes/stripeRoutes.js";
// import { createRequire } from "module";
// const require = createRequire(import.meta.url);
// const serviceAccount = require("./serviceAccountKey.json");


// import { createPaymentIntent, capturePaymentIntent, refundPaymentIntent } from "./stripeService.js";

// // ⚡ Pour être sûr que Firebase détecte le project_id
// process.env.GOOGLE_APPLICATION_CREDENTIALS = "./serviceAccountKey.json";

// // Initialisation Firebase Admin
// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// const app = express();
// app.use(express.json());
// // toutes les routes Stripe
// app.use("/api/stripe", stripeRoutes);


// app.use(cors({
//   origin: ["http://localhost:3000", "http://192.168.1.42:3000"], // front accessible depuis le mobile
//   methods: ["GET","POST","PUT","DELETE"],
// }));

// // Middleware de log
// app.use((req, res, next) => {
//   console.log(`[REQUEST] ${req.method} ${req.url}`, req.body);
//   next();
// });

// /**
//  * 1️⃣ Créer un paiement (escrow)
//  */
// app.post("/create-payment", async (req, res) => {
//   const { reportId, amount } = req.body;
//   try {
//     console.log(`➡️ Création PaymentIntent pour report ${reportId}, montant: ${amount}`);

//     const paymentIntent = await createPaymentIntent(amount);
//     console.log("✅ PaymentIntent créé :", paymentIntent.id, "statut:", paymentIntent.status);

//     await admin.firestore().collection("reports").doc(reportId).update({
//       escrowStatus: "created",
//       status: "created",
//       paymentIntentId: paymentIntent.id,
//     });

//     res.json({
//       clientSecret: paymentIntent.client_secret,
//       paymentIntentId: paymentIntent.id,
//     });
//   } catch (err) {
//     console.error("❌ Erreur create-payment :", err.message);
//     res.status(500).json({ error: err.message });
//   }
// });

// *
//  * 2️⃣ Libérer le paiement (capture)

// app.post("/release-payment", async (req, res) => {
//   const { reportId } = req.body; // <-- on ne dépend plus du frontend pour l'ID Stripe

//   try {
//     // 1️⃣ Récupérer le report
//     const reportDoc = await admin.firestore().collection("reports").doc(reportId).get();
//     if (!reportDoc.exists) throw new Error("Report non trouvé");

//     const report = reportDoc.data();
//     const paymentIntentId = report.paymentIntentId;
//     if (!paymentIntentId) throw new Error("PaymentIntent ID manquant dans le report");

//     console.log(`➡️ Capture PaymentIntent ${paymentIntentId}`);

//     // 2️⃣ Capturer le paiement
//     const paymentIntent = await capturePaymentIntent(paymentIntentId);
//     console.log("✅ Paiement capturé :", paymentIntent.id, "statut:", paymentIntent.status);

//     // 3️⃣ Mettre à jour le report
//     await admin.firestore().collection("reports").doc(reportId).update({
//       escrowStatus: "released",
//       status: "terminé",
//     });

//     res.json({ success: true, paymentIntent });
//   } catch (err) {
//     console.error("❌ Erreur release-payment :", err.message);
//     res.status(500).json({ error: err.message });
//   }
// });


// /**
//  * 3️⃣ Rembourser (refund)
//  */
// app.post("/refund-payment", async (req, res) => {
//   const { reportId, paymentIntentId } = req.body;
//   try {
//     console.log(`➡️ Refund PaymentIntent ${paymentIntentId}`);
//     const refund = await refundPaymentIntent(paymentIntentId);
//     console.log("✅ Paiement remboursé :", refund.id);

//     await admin.firestore().collection("reports").doc(reportId).update({
//       escrowStatus: "refunded",
//       status: "remboursé",
//     });

//     res.json({ success: true, refund });
//   } catch (err) {
//     console.error("❌ Erreur refund-payment :", err.message);
//     res.status(500).json({ error: err.message });
//   }
// });

// const PORT = process.env.PORT || 4242;
// app.listen(PORT, () => console.log(`Stripe server running on port ${PORT}`));


//SERVER MOBILE ET DESKTOP

import "dotenv/config";
import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import stripeRoutes from "./routes/stripeRoutes.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

import { createPaymentIntent, capturePaymentIntent, refundPaymentIntent } from "./stripeService.js";

// ⚡ Pour être sûr que Firebase détecte le project_id
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./serviceAccountKey.json";

// Initialisation Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const app = express();
app.use(express.json());

// CORS : autoriser le front desktop et mobile sur le même réseau
app.use(cors({
  origin: [
    "http://localhost:3000",              // dev local
    "http://192.168.1.42:3000",           // test mobile LAN
    "https://solid-auto-app.web.app"      // ton app déployée sur Firebase
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));


// toutes les routes Stripe
app.use("/api/stripe", stripeRoutes);

// Middleware de log
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`, req.body);
  next();
});

// ------------------ Endpoint test pour mobile ------------------
app.get("/", (req, res) => {
  res.send("✅ Backend actif sur 4242");
});

// ------------------ Paiement (escrow) ------------------
app.post("/create-payment", async (req, res) => {
  const { reportId, amount } = req.body;
  try {
    const paymentIntent = await createPaymentIntent(amount);
    await admin.firestore().collection("reports").doc(reportId).update({
      escrowStatus: "created",
      status: "created",
      paymentIntentId: paymentIntent.id,
    });
    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    console.error("❌ Erreur create-payment :", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/release-payment", async (req, res) => {
  const { reportId } = req.body;
  try {
    const reportDoc = await admin.firestore().collection("reports").doc(reportId).get();
    if (!reportDoc.exists) throw new Error("Report non trouvé");
    const report = reportDoc.data();
    if (!report.paymentIntentId) throw new Error("PaymentIntent ID manquant");

    const paymentIntent = await capturePaymentIntent(report.paymentIntentId);
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

app.post("/refund-payment", async (req, res) => {
  const { reportId, paymentIntentId } = req.body;
  try {
    const refund = await refundPaymentIntent(paymentIntentId);
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

// ------------------ Lancement du serveur ------------------
const PORT = process.env.PORT || 4242;
app.listen(PORT, "0.0.0.0", () => console.log(`Stripe server running on port ${PORT}`));

