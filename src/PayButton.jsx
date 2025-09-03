import React, { useState } from "react";
import ModalPortal from "./ModalPortal";
import { toast } from "react-toastify";
import { createEscrow } from "./services/escrowService.js"; // utilise ton service existant

export default function PayButton({ report }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 w-auto max-w-[200px]"
      >
        💳 Payer le dépannage
      </button>

      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <h3 className="mb-4 text-lg font-bold">Paiement du dépannage</h3>
          <PayButtonInner
            report={report}
            onClose={() => setShowModal(false)}
          />
        </ModalPortal>
      )}
    </>
  );
}

// Séparer l’appel Stripe du modal pour éviter la récursion
function PayButtonInner({ report, onClose }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const result = await createEscrow(report.id, report.frais, (status) => {
        console.log("Payment status:", status);
      });

      if (result.success) {
        toast.success("✅ Paiement préparé ! Argent bloqué (escrow).");
        onClose();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error("Erreur paiement :", err);
      toast.error("❌ Impossible de démarrer le paiement !");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 w-auto min-w-[140px] max-w-[200px]"
    >
      {loading ? "⏳ Traitement..." : "💳 Payer maintenant"}
    </button>
  );
}
