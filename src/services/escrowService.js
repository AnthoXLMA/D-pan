// src/services/escrowService.js

const API_URL = "http://localhost:4242";

/**
 * 1️⃣ Créer un séquestre (paiement en attente)
 */
export const createEscrow = async (reportId, amount) => {
  try {
    // Cas 0 € → pas besoin de Stripe
    if (!amount || amount <= 0) {
      console.log("💰 Escrow 0 € créé pour report:", reportId);
      return { success: true, status: "created" };
    }

    const res = await fetch(`${API_URL}/create-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, amount }),
    });

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

    const data = await res.json();

    console.log("✅ Escrow créé pour report:", reportId, data);
    return { success: true, ...data, status: "pending" }; // contient clientSecret + paymentIntentId
  } catch (err) {
    console.error("❌ createEscrow:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 2️⃣ Libérer le paiement (capturer le séquestre)
 */
export const releaseEscrow = async (reportId, setPaymentStatus) => {
  if (!reportId) {
    console.error("❌ releaseEscrow: reportId manquant !");
    return;
  }

  const res = await fetch(`${API_URL}/release-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId }),
  });

  const data = await res.json();
  if (data.success) setPaymentStatus("released");
};




/**
 * 3️⃣ Rembourser le paiement (si annulé)
 */
export const refundEscrow = async (paymentIntentId, setPaymentStatus) => {
  if (!paymentIntentId) return;

  const res = await fetch(`${API_URL}/refund-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentIntentId }),
  });

  const data = await res.json();
  if (data.success && setPaymentStatus) setPaymentStatus("refunded");
};

