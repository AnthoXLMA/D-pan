// src/services/escrowService.js
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase.js"; // adapte le chemin selon ton projet


// const API_URL = "http://localhost:4242";
// const API_URL = "http://192.168.1.42:4242/api/stripe";
const ESCROW_API_URL = "http://192.168.1.42:4242"; // sans /api/stripe


/**
 * 1️⃣ Créer un séquestre (paiement en attente)
 */
export const createEscrow = async (reportId, amount) => {
  try {
    if (!amount || amount <= 0) {
      await updateDoc(doc(db, "reports", reportId), { escrowStatus: "created" });
      console.log("💰 Escrow 0 € créé pour report:", reportId);
      return { success: true, status: "created" };
    }

    const res = await fetch(`${ESCROW_API_URL}/create-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, amount }),
    });

    let data = {};
    if (res.ok) data = await res.json();
    else console.warn(`⚠️ Stripe backend returned ${res.status} for report ${reportId}`);

    await updateDoc(doc(db, "reports", reportId), {
      escrowStatus: "created",
      paymentIntentId: data.paymentIntentId || null
    });

    console.log("✅ Escrow créé pour report:", reportId, data);
    return { success: true, ...data, status: "created" };
  } catch (err) {
    console.error("❌ createEscrow:", err.message);
    // On met quand même à jour Firestore pour que le modal s’ouvre
    await updateDoc(doc(db, "reports", reportId), { escrowStatus: "created" });
    return { success: false, error: err.message, status: "created" };
  }
};


/**
 * 2️⃣ Libérer le paiement (capturer le séquestre)
 */
export const releaseEscrow = async (reportId, setPaymentStatus) => {
  if (!reportId) return;

  const res = await fetch(`${ESCROW_API_URL}/release-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId }),
  });

  const data = await res.json();
  if (data.success) {
    setPaymentStatus("released");
    await updateDoc(doc(db, "reports", reportId), { escrowStatus: "released" });
  }

  return data;
};





/**
 * 3️⃣ Rembourser le paiement (si annulé)
 */
export const refundEscrow = async (paymentIntentId, setPaymentStatus) => {
  if (!paymentIntentId) return;

  const res = await fetch(`${ESCROW_API_URL}/refund-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentIntentId }),
  });

  const data = await res.json();
  if (data.success && setPaymentStatus) setPaymentStatus("refunded");
};

