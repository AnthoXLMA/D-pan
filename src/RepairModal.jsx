import React, { useEffect, useState } from "react";
import { releaseEscrow, refundEscrow } from "./services/escrowService.js";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "react-toastify";

export default function RepairModal({ report, solidaire, userPosition, onClose }) {
  const [distance, setDistance] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(report?.escrowStatus || report?.paymentStatus || null);
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
  }, [report?.latitude, report?.longitude, userPosition]);

  // ---------------- Écoute Firestore en temps réel ----------------
  useEffect(() => {
    if (!report?.id) return;

    const unsubscribe = onSnapshot(doc(db, "reports", report.id), (docSnap) => {
      const data = docSnap.data();
      if (!data) return;

      setPaymentStatus(data.escrowStatus || data.paymentStatus);

      if (data.escrowStatus === "released") {
        toast.success("💸 Paiement libéré ! Le sinistré a payé, vous pouvez terminer le dépannage.");
      }
      if (data.escrowStatus === "refunded") {
        toast.error("⚠️ Paiement remboursé !");
      }
    });

    return () => unsubscribe();
  }, [report?.id]);

  if (!report) return null;

  // ---------------- Actions ----------------
  const handleRelease = async () => {
    setLoadingAction(true);
    await releaseEscrow(report.id, setPaymentStatus);
    setLoadingAction(false);
  };

  const handleRefund = async () => {
    setLoadingAction(true);
    await refundEscrow(report.id, setPaymentStatus);
    setLoadingAction(false);
  };

  // ---------------- UI ----------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-11/12 max-w-md animate-fade-in">
        <h2 className="text-xl font-bold mb-4">🚨 Dépannage en cours</h2>

        <p>👤 Sinistré : {report.ownerName || "Inconnu"} ({report.ownerEmail || "?"})</p>
        <p>💰 Montant : {report.frais} €</p>
        <p>🛠 Nature : {report.nature}</p>
        <p>📍 Adresse : {report.address}</p>
        {distance && <p>⏳ Distance restante : {distance} km</p>}

        {/* États paiement */}
        {paymentStatus === null && (
          <p className="text-gray-500 mt-2">⏳ En attente du séquestre…</p>
        )}
        {paymentStatus === "pending" && (
          <p className="text-blue-600 mt-2">💰 Paiement bloqué, en attente…</p>
        )}
        {paymentStatus === "released" && (
          <p className="text-green-600 mt-2">✅ Paiement libéré !</p>
        )}
        {paymentStatus === "refunded" && (
          <p className="text-red-600 mt-2">⚠️ Paiement remboursé !</p>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {paymentStatus === "released" && (
            <button
              className={`bg-green-500 text-white px-4 py-2 rounded flex-1 ${loadingAction ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleRelease}
              disabled={loadingAction}
            >
              Terminé
            </button>
          )}

          <button
            className="bg-blue-500 text-white px-4 py-2 rounded flex-1"
            onClick={() =>
              window.open(`https://maps.google.com?q=${report.latitude},${report.longitude}`, "_blank")
            }
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

        <button
          className="mt-4 w-full bg-gray-300 px-4 py-2 rounded"
          onClick={onClose}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
