import React, { useState, useRef } from "react";
import { PANNE_TYPES } from "./constants/pannes";
import { useSwipeable } from "react-swipeable";

export default function ReportForm({ userPosition, onNewReport, onClose }) {
  const [nature, setNature] = useState(PANNE_TYPES[0].value);
  const [message, setMessage] = useState("");
  const carouselRef = useRef(null);

  // Gestion swipe avec react-swipeable
  const handlers = useSwipeable({
    onSwipedLeft: () => slideNext(),
    onSwipedRight: () => slidePrev(),
    delta: 20, // sensibilité
    trackMouse: true, // pour test desktop avec la souris
  });

  const slideNext = () => {
    const index = PANNE_TYPES.findIndex((p) => p.value === nature);
    const nextIndex = (index + 1) % PANNE_TYPES.length;
    setNature(PANNE_TYPES[nextIndex].value);
  };

  const slidePrev = () => {
    const index = PANNE_TYPES.findIndex((p) => p.value === nature);
    const prevIndex = (index - 1 + PANNE_TYPES.length) % PANNE_TYPES.length;
    setNature(PANNE_TYPES[prevIndex].value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userPosition) return;

    onNewReport({
      latitude: userPosition[0],
      longitude: userPosition[1],
      nature,
      message,
      status: "en-attente",
      address: "Adresse inconnue",
    });

    setMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end bg-black/50 p-4">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh] animate-fade-in"
        style={{ marginBottom: "120px" }}
      >
        <h3 className="text-center text-xl font-bold p-4 border-b">
          Signaler une panne
        </h3>

        {/* Carousel swipe */}
        <div
          {...handlers}
          ref={carouselRef}
          className="flex overflow-x-auto p-4 touch-pan-x"
        >
          {PANNE_TYPES.map((p) => (
            <div
              key={p.value}
              onClick={() => setNature(p.value)}
              className={`flex-shrink-0 flex flex-col items-center justify-center w-40 h-40 p-4 m-2 rounded-lg border cursor-pointer transition-transform ${
                nature === p.value
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-300 bg-white"
              }`}
            >
              <div className="text-4xl mb-2">{p.icon}</div>
              <div className="text-center font-medium">{p.label}</div>
            </div>
          ))}
        </div>

        {/* Contenu scrollable */}
        <div className="px-4 flex-1 overflow-y-auto">
          <textarea
            placeholder="De quoi avez-vous besoin?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
            rows={3}
          />
        </div>

        {/* Footer avec boutons */}
        <div className="flex gap-3 p-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border bg-gray-200 hover:bg-gray-300 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
