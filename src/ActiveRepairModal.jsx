import React, { useEffect, useState } from "react";
import { releaseEscrow, refundEscrow } from "./services/escrowService.js";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "react-toastify";

export default function ActiveRepairModal({ report, solidaire, userPosition, onComplete }) {
  const [distance, setDistance] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(report.paymentStatus || null);
  const [loadingAction, setLoadingAction] = useState(false);

  // ---------------- Calcul distance en temps réel ----------------
  useEffect(() => {
    if (!report?.latitude || !report?.longitude || !userPosition) return;

    const calculateDistance = () => {
      const toRad = (deg) => (deg * Math.PI) / 180;
      const R = 6371; // rayon Terre km
      const dLat = toRad(report.latitude - userPosition[0]);
      const dLon = toRad(report.longitude - userPosition[1]);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(userPosition[0])) *
          Math.cos(toRad(report.latitude)) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      setDistance((R * c).toFixed(1));
    };

    calculateDistance();
    const interval = setInterval(calculateDistance, 5000);
    return () => clearInterval(interval);
  }, [report.latitude, report.longitude, userPosition]);

  // ---------------- Écoute Firestore en temps réel ----------------
  useEffect(() => {
    if (!report?.id) return;

    const unsubscribe = onSnapshot(doc(db, "reports", report.id), (docSnap) => {
      const data = docSnap.data();
      if (!data) return;

      // Mise à jour statut de paiement
      setPaymentStatus(data.escrowStatus);

      // Notification si paiement libéré
      if (data.escrowStatus === "released") {
        toast.success("💸 Paiement libéré ! Le sinistré a payé, vous pouvez partir !");
      }
    });

    return () => unsubscribe();
  }, [report?.id]);

  if (!report) return null;

  // ---------------- Gestion actions ----------------
  const handleRelease = async () => {
    setLoadingAction(true);
    await releaseEscrow(report.id, setPaymentStatus);
    onComplete(report.id);
    setLoadingAction(false);
  };

  const handleRefund = async () => {
    setLoadingAction(true);
    await refundEscrow(report.id, setPaymentStatus);
    setLoadingAction(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-11/12 max-w-md animate-fade-in">
        <h2 className="text-xl font-bold mb-4">Dépannage en cours</h2>

        <p>📍 Sinistré : {report.ownerName} ({report.ownerEmail})</p>
        <p>💰 Montant : {report.frais} €</p>
        <p>🛠 Nature : {report.nature}</p>
        <p>📍 Adresse : {report.address}</p>
        {distance && <p>⏳ Distance restante : {distance} km</p>}

        {/* Paiement */}
        {paymentStatus === null && (
          <button
            onClick={() => setPaymentStatus("pending")}
            className="bg-yellow-400 text-white px-4 py-2 rounded mt-2 w-full"
          >
            Bloquer le paiement
          </button>
        )}
        {paymentStatus === "pending" && (
          <p className="text-blue-600 mt-2">⏳ Paiement bloqué, en attente...</p>
        )}
        {paymentStatus === "released" && (
          <p className="text-green-600 mt-2">✅ Paiement effectué !</p>
        )}
        {paymentStatus === "refunded" && (
          <p className="text-red-600 mt-2">⚠️ Paiement remboursé !</p>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className={`bg-green-500 text-white px-4 py-2 rounded flex-1 ${loadingAction ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={handleRelease}
            disabled={loadingAction}
          >
            Terminé
          </button>

          <button
            className="bg-blue-500 text-white px-4 py-2 rounded flex-1"
            onClick={() => window.open(`https://maps.google.com?q=${report.latitude},${report.longitude}`, "_blank")}
          >
            Itinéraire
          </button>

          <button
            className="bg-gray-500 text-white px-4 py-2 rounded flex-1"
            onClick={() => alert(`Contact: ${report.ownerEmail}`)}
          >
            Contacter
          </button>

          <button
            className={`bg-red-500 text-white px-4 py-2 rounded flex-1 ${loadingAction ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={handleRefund}
            disabled={loadingAction}
          >
            Annuler / Rembourser
          </button>
        </div>
      </div>
    </div>
  );
}
