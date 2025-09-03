import React, { useEffect, useState } from "react";
import { releaseEscrow, refundEscrow } from "./services/escrowService.js";

export default function ActiveRepairModal({ report, solidaire, userPosition, onComplete }) {
  const [distance, setDistance] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(report.paymentStatus || null);

  // Calcul distance en temps réel (Haversine)
  useEffect(() => {
    if (!report.latitude || !report.longitude || !userPosition) return;

    const calculateDistance = () => {
      const R = 6371;
      const dLat = ((report.latitude - userPosition[0]) * Math.PI) / 180;
      const dLon = ((report.longitude - userPosition[1]) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((userPosition[0] * Math.PI) / 180) *
          Math.cos((report.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      setDistance(dist.toFixed(1));
    };

    calculateDistance();
    const interval = setInterval(calculateDistance, 5000); // mise à jour toutes les 5 sec
    return () => clearInterval(interval);
  }, [report.latitude, report.longitude, userPosition]);

  if (!report) return null;

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
            className="bg-yellow-400 text-white px-4 py-2 rounded mt-2"
          >
            Bloquer le paiement
          </button>
        )}
        {paymentStatus === "pending" && <p className="text-blue-600 mt-2">⏳ Paiement bloqué, en attente...</p>}
        {paymentStatus === "released" && <p className="text-green-600 mt-2">✅ Paiement effectué !</p>}
        {paymentStatus === "refunded" && <p className="text-red-600 mt-2">⚠️ Paiement remboursé !</p>}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded flex-1"
            onClick={() => {
              releaseEscrow(report.id, setPaymentStatus);
              onComplete(report.id);
            }}
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
            className="bg-red-500 text-white px-4 py-2 rounded flex-1"
            onClick={() => refundEscrow(report.id, setPaymentStatus)}
          >
            Annuler / Rembourser
          </button>
        </div>
      </div>
    </div>
  );
}
