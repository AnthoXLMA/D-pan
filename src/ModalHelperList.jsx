import React, { useState } from "react";
import { getDistanceKm } from "./utils/distance";

export default function ModalHelperList({ helpers, onClose, userPosition, onAlert, activeReport }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!helpers || helpers.length === 0) return null;

  const currentHelper = helpers[currentIndex];
  const distance = getDistanceKm(
    userPosition[0],
    userPosition[1],
    currentHelper.latitude,
    currentHelper.longitude
  );

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? helpers.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === helpers.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 overflow-hidden relative">
        <h3 className="text-center text-xl font-bold mb-4">Utilisateurs disponibles</h3>

        <div className="flex items-center justify-between">
          {/* Flèche gauche */}
          <button
            onClick={handlePrev}
            className="text-2xl font-bold px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300"
          >
            ←
          </button>

          {/* Carte du helper */}
          <div className="flex-1 mx-4 p-4 border rounded-2xl shadow flex flex-col items-center
                          h-[250px] w-full max-w-xs overflow-y-auto">
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${currentHelper.online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <div className="font-medium text-lg text-center">{currentHelper.name}</div>
              <span className={`ml-2 text-sm ${currentHelper.online ? 'text-green-600' : 'text-gray-500'}`}>
                {currentHelper.online ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>

            <div className="text-sm text-gray-500 text-center mt-2">
              Matériel: {Array.isArray(currentHelper.materiel) ? currentHelper.materiel.join(", ") : currentHelper.materiel || "N/A"}
            </div>
            <div className="text-sm text-gray-400 mt-1 text-center">Distance: {distance} km</div>

            <button
              onClick={() => onAlert(currentHelper)}
              className={`mt-auto px-3 py-1 rounded-lg text-white ${currentHelper.online && activeReport ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
              disabled={!activeReport || !currentHelper.online}
              title={!activeReport ? "Vous devez avoir un signalement actif" : !currentHelper.online ? "Utilisateur hors ligne" : ""}
            >
              ⚡ Alerter
            </button>
          </div>

          {/* Flèche droite */}
          <button
            onClick={handleNext}
            className="text-2xl font-bold px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300"
          >
            →
          </button>
        </div>

        {/* Bouton fermer */}
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
