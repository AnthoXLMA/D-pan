// src/components/InProgressModal.jsx
import React, { useState, useEffect } from "react";
import { releaseEscrow } from "./services/escrowService.js";
import { toast } from "react-toastify";

export default function InProgressModal({
  isOpen,
  onClose,
  report,
  solidaire,
  setPaymentStatus,
  onComplete,
}) {
  const [loading, setLoading] = useState(false);

  // Reset loading si le modal se ferme ou change de report/solidaire
  useEffect(() => {
    if (!isOpen) setLoading(false);
  }, [isOpen, report, solidaire]);

  // Ne rien afficher si modal fermé ou props manquantes
  if (!isOpen || !report || !solidaire) return null;

  const handleComplete = async () => {
    try {
      // Cas où le montant est 0 € → pas de paiement à libérer
      if (!report.frais || report.frais <= 0) {
        toast.success("✅ Dépannage terminé (sans paiement) !");
        onComplete?.(report.id);
        onClose?.();
        return;
      }

      setLoading(true);
      setPaymentStatus?.("releasing");

      const result = await releaseEscrow(report.id, setPaymentStatus);

      if (result.success) {
        toast.success("💸 Paiement libéré !");
      } else {
        toast.error(`❌ Erreur libération paiement : ${result.error}`);
      }

      onComplete?.(report.id);
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur lors de la libération du paiement");
    } finally {
      setLoading(false);
    }
  };

//   const handleComplete = async () => {
//   setLoading(true);
//   const res = await releaseEscrow(report.id, report.paymentIntentId);
//   if (res.success) {
//     toast.success("💸 Paiement libéré !");
//   } else {
//     toast.error(res.error);
//   }
//   setLoading(false);
// };


  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-11/12 animate-fade-in relative">
        <h2 className="text-lg font-bold mb-4">Dépannage en cours</h2>

        <p className="mb-2">
          <strong>Solidaire :</strong> {solidaire.name}
        </p>
        <p className="mb-2">
          <strong>Sinistré :</strong> {report.ownerName || report.ownerEmail}
        </p>
        <p className="mb-2">
          <strong>Montant :</strong> {report.frais} €
        </p>
        <p className="mb-2">
          <strong>Localisation :</strong> {report.latitude}, {report.longitude}
        </p>
        {report.materiel && (
          <p className="mb-2">
            <strong>Matériel :</strong> {report.materiel}
          </p>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleComplete}
            disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            ✅ {loading ? "Libération en cours..." : "Terminer le dépannage"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            🔒 Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
