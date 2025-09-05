import React from "react";

export default function AlertHistory({ alerts, onClose }) {
  if (!alerts || alerts.length === 0)
    return <div className="p-4">Aucune alerte reçue pour le moment.</div>;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-start pt-20 z-50">
      <div className="bg-white rounded-2xl shadow-lg w-11/12 max-w-md p-4 overflow-y-auto max-h-[80%]">
        <h2 className="text-xl font-bold mb-4 text-center">Historique des alertes</h2>
        <ul>
          {alerts.map((a) => (
            <li key={a.id} className="border-b py-2">
              <div>🚨 Report: {a.reportId}</div>
              <div>De: {a.fromUid}</div>
              <div>Statut: {a.status}</div>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
