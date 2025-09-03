import React, { useState } from "react";
import HelpModal from "./HelpModal.js";

export default function SolidarComponent({ distance, tarifKm }) {
  const [isModalOpen, setModalOpen] = useState(false);

  const handleProposeHelp = () => {
    setModalOpen(true); // Ouvre le modal
  };

  return (
    <div>
      <button onClick={handleProposeHelp}>Proposer de l'aide</button>
      <HelpModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        distance={distance}
        tarifKm={tarifKm}
      />
    </div>
  );
}
